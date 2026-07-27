import { Router } from 'express'
import multer from 'multer'
import { getAuth } from '@clerk/express'
import { listIntegrations, createPost, listPosts, deletePost, uploadFile } from './postizClient.js'
import { resolvePostizCustomer } from './tenant.js'
import { generateCaption, isCaptionAssistConfigured } from './captionAssist.js'
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_ITEMS,
  isAllowedImageType
} from './mediaRules.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1
  },
  fileFilter: function (req, file, done) {
    if (!isAllowedImageType(file.mimetype)) {
      done(new Error('Unsupported file type. Use JPG, PNG, GIF, or WebP.'))
      return
    }
    done(null, true)
  }
})

function requireUser(req, res) {
  const auth = getAuth(req)
  if (!auth.userId) {
    res.status(401).json({ error: 'Not signed in' })
    return null
  }
  resolvePostizCustomer(auth.userId)
  return auth
}

function normalizePosts(data) {
  if (Array.isArray(data)) {
    return data
  }
  if (data && Array.isArray(data.posts)) {
    return data.posts
  }
  return []
}

function normalizeImages(images) {
  const cleaned = []
  if (!Array.isArray(images)) {
    return cleaned
  }
  let index = 0
  while (index < images.length) {
    const item = images[index]
    if (item && item.id && item.path) {
      cleaned.push({ id: String(item.id), path: String(item.path) })
    }
    index = index + 1
  }
  return cleaned
}

function buildPostEntries(body) {
  const content = body.content || ''
  const images = normalizeImages(body.images)
  let channels = []

  if (Array.isArray(body.channels) && body.channels.length > 0) {
    channels = body.channels
  } else if (body.channelId) {
    channels = [{ id: body.channelId, platform: body.platform }]
  }

  return channels.map(function (channel) {
    return {
      integration: { id: channel.id },
      value: [{ content: content, image: images }],
      settings: { __type: channel.platform }
    }
  })
}

router.get('/channels', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  try {
    const integrations = await listIntegrations()
    const list = Array.isArray(integrations) ? integrations : []
    const channels = list.map(function (item) {
      return {
        id: item.id,
        name: item.name,
        platform: item.identifier,
        picture: item.picture,
        disabled: item.disabled
      }
    })
    res.json({ channels: channels })
  } catch (error) {
    res.status(502).json({ error: 'Could not reach Postiz' })
  }
})

router.get('/posts', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  const startDate = req.query.startDate
  const endDate = req.query.endDate
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' })
  }
  try {
    const data = await listPosts(startDate, endDate)
    const posts = normalizePosts(data).map(function (item) {
      const integration = item.integration || {}
      return {
        id: item.id,
        content: item.content,
        publishDate: item.publishDate,
        releaseURL: item.releaseURL,
        state: item.state,
        channelId: integration.id,
        channelName: integration.name,
        platform: integration.providerIdentifier
      }
    })
    res.json({ posts: posts })
  } catch (error) {
    res.status(502).json({ error: 'Could not load posts from Postiz' })
  }
})

router.post('/upload', function (req, res) {
  if (!requireUser(req, res)) {
    return
  }

  upload.single('file')(req, res, async function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image is too large (max 10 MB)' })
      }
      return res.status(400).json({ error: err.message || 'Upload failed' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }
    if (!isAllowedImageType(req.file.mimetype)) {
      return res.status(400).json({ error: 'Unsupported file type. Allowed: ' + ALLOWED_IMAGE_TYPES.join(', ') })
    }

    try {
      const uploaded = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype)
      res.json({
        id: uploaded.id,
        path: uploaded.path,
        name: uploaded.name || req.file.originalname
      })
    } catch (error) {
      res.status(502).json({ error: 'Could not upload image to Postiz' })
    }
  })
})

router.post('/posts', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  const body = req.body
  const images = normalizeImages(body.images)
  if (images.length > MAX_IMAGE_ITEMS) {
    return res.status(400).json({ error: 'Too many images (max ' + MAX_IMAGE_ITEMS + ')' })
  }

  const postEntries = buildPostEntries(body)
  if (postEntries.length === 0) {
    return res.status(400).json({ error: 'Select at least one channel' })
  }

  const hasContent = body.content && String(body.content).trim()
  if (!hasContent && images.length === 0) {
    return res.status(400).json({ error: 'Add text or an image before posting' })
  }

  const postType = body.type === 'schedule' ? 'schedule' : 'now'
  if (postType === 'schedule') {
    const scheduled = new Date(body.date)
    if (Number.isNaN(scheduled.getTime())) {
      return res.status(400).json({ error: 'Invalid schedule time' })
    }
    if (scheduled.getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Schedule time must be in the future' })
    }
  }

  const payload = {
    type: postType,
    date: body.date || new Date().toISOString(),
    shortLink: false,
    tags: [],
    posts: postEntries
  }

  try {
    const result = await createPost(payload)
    res.json(result)
  } catch (error) {
    res.status(502).json({ error: 'Could not create post in Postiz' })
  }
})

router.post('/captions', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  if (!isCaptionAssistConfigured()) {
    return res.status(503).json({ error: 'Add OPENAI_API_KEY to server/.env to enable AI captions' })
  }

  const body = req.body || {}
  const draft = body.draft ? String(body.draft).trim() : ''
  const topic = body.topic ? String(body.topic).trim() : ''
  if (!draft && !topic) {
    return res.status(400).json({ error: 'Provide a topic or draft to generate a caption' })
  }

  const platforms = []
  if (Array.isArray(body.platforms)) {
    let index = 0
    while (index < body.platforms.length) {
      if (body.platforms[index]) {
        platforms.push(String(body.platforms[index]))
      }
      index = index + 1
    }
  }

  try {
    const result = await generateCaption({
      draft: draft,
      topic: topic,
      tone: body.tone,
      platforms: platforms
    })
    res.json(result)
  } catch (error) {
    const message = error && error.message ? error.message : 'Could not generate caption'
    if (message.indexOf('OPENAI_API_KEY') !== -1) {
      return res.status(503).json({ error: message })
    }
    if (message.indexOf('too long') !== -1) {
      return res.status(400).json({ error: message })
    }
    res.status(502).json({ error: 'Could not generate caption' })
  }
})

router.delete('/posts/:id', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  try {
    const result = await deletePost(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(502).json({ error: 'Could not delete post in Postiz' })
  }
})

export default router

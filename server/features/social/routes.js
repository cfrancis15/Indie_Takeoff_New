import { Router } from 'express'
import multer from 'multer'
import { getAuth } from '@clerk/express'
import {
  listIntegrations,
  createPost,
  listPosts,
  deletePost,
  uploadFile,
  getConnectUrl,
  deleteIntegration,
  connectBlueskyCredentials,
  connectApiKeyProvider,
  triggerIntegrationTool
} from './postizClient.js'
import { resolvePostizCustomer } from './tenant.js'
import { generateCaption, isCaptionAssistConfigured } from './captionAssist.js'
import {
  CONNECTABLE_PROVIDERS,
  findProvider,
  getPostizAppUrl,
  isMvpPlatform,
  isArticlePlatform
} from './providers.js'
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

function parseArticleTags(raw) {
  const text = String(raw || '')
  const parts = text.split(',')
  const tags = []
  let index = 0
  while (index < parts.length) {
    const label = parts[index].trim()
    if (label) {
      tags.push({ value: label, label: label })
    }
    index = index + 1
  }
  return tags
}

function mapHashnodeTags(rawTags, availableTags) {
  const tags = []
  let index = 0
  while (index < rawTags.length) {
    const wanted = String(rawTags[index].label || rawTags[index].value || '').toLowerCase()
    let matched = null
    let availIndex = 0
    while (availIndex < availableTags.length) {
      const option = availableTags[availIndex]
      const label = String(option.label || option.name || '').toLowerCase()
      const value = String(option.value || option.id || option.objectID || '')
      if (label === wanted || value.toLowerCase() === wanted) {
        matched = {
          value: value || String(option.value || option.id || option.objectID),
          label: option.label || option.name || rawTags[index].label
        }
        break
      }
      availIndex = availIndex + 1
    }
    if (matched) {
      tags.push(matched)
    } else {
      tags.push(rawTags[index])
    }
    index = index + 1
  }
  return tags
}

function buildChannelSettings(channel, body, images) {
  const platform = channel.platform

  if (platform === 'devto') {
    const title = String(body.articleTitle || '').trim()
    const tags = parseArticleTags(body.articleTags)
    const settings = {
      __type: 'devto',
      title: title,
      tags: tags
    }
    const canonical = String(body.articleCanonical || '').trim()
    if (canonical) {
      settings.canonical = canonical
    }
    if (images.length > 0) {
      settings.main_image = { id: images[0].id, path: images[0].path }
    }
    return settings
  }

  if (platform === 'hashnode') {
    const title = String(body.articleTitle || '').trim()
    const publication = String(body.hashnodePublication || '').trim()
    const subtitle = String(body.articleSubtitle || '').trim()
    let tags = parseArticleTags(body.articleTags)
    if (Array.isArray(body.hashnodeTagOptions) && body.hashnodeTagOptions.length > 0) {
      tags = mapHashnodeTags(tags, body.hashnodeTagOptions)
    }
    const settings = {
      __type: 'hashnode',
      title: title,
      publication: publication,
      tags: tags
    }
    if (subtitle) {
      settings.subtitle = subtitle
    }
    const canonical = String(body.articleCanonical || '').trim()
    if (canonical) {
      settings.canonical = canonical
    }
    if (images.length > 0) {
      settings.main_image = { id: images[0].id, path: images[0].path }
    }
    return settings
  }

  return { __type: platform }
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
      settings: buildChannelSettings(channel, body, images)
    }
  })
}

function validateArticleFields(body, channels) {
  let needsDevto = false
  let needsHashnode = false
  let index = 0
  while (index < channels.length) {
    if (channels[index].platform === 'devto') {
      needsDevto = true
    }
    if (channels[index].platform === 'hashnode') {
      needsHashnode = true
    }
    index = index + 1
  }

  if (!needsDevto && !needsHashnode) {
    return null
  }

  const title = String(body.articleTitle || '').trim()
  if (needsDevto && title.length < 2) {
    return 'Dev.to posts need an article title'
  }
  if (needsHashnode && title.length < 6) {
    return 'Hashnode titles must be at least 6 characters'
  }
  if (needsHashnode) {
    const publication = String(body.hashnodePublication || '').trim()
    if (!publication) {
      return 'Hashnode needs a publication ID'
    }
    const tags = parseArticleTags(body.articleTags)
    if (tags.length < 1) {
      return 'Hashnode needs at least one tag'
    }
  }
  if (needsDevto) {
    const tags = parseArticleTags(body.articleTags)
    if (tags.length > 4) {
      return 'Dev.to allows at most 4 tags'
    }
  }
  return null
}

router.get('/channels', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  try {
    const integrations = await listIntegrations()
    const list = Array.isArray(integrations) ? integrations : []
    const channels = list
      .filter(function (item) {
        return isMvpPlatform(item.identifier)
      })
      .map(function (item) {
        return {
          id: item.id,
          name: item.name,
          platform: item.identifier,
          picture: item.picture,
          disabled: item.disabled,
          profile: item.profile || null
        }
      })
    res.json({ channels: channels })
  } catch (error) {
    res.status(502).json({ error: 'Could not reach Postiz' })
  }
})

router.get('/providers', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  res.json({
    providers: CONNECTABLE_PROVIDERS,
    postizAppUrl: getPostizAppUrl()
  })
})

router.post('/connect/bluesky', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }

  const body = req.body || {}
  const identifier = String(body.identifier || '').trim()
  const password = String(body.password || '')
  const service = String(body.service || 'https://bsky.social').trim()
  const timezone = body.timezone != null ? String(body.timezone) : String(-(new Date().getTimezoneOffset()))

  if (!identifier) {
    return res.status(400).json({ error: 'Bluesky handle is required' })
  }
  if (!password) {
    return res.status(400).json({ error: 'Bluesky app password is required' })
  }

  try {
    const result = await connectBlueskyCredentials({
      identifier: identifier,
      password: password,
      service: service || 'https://bsky.social',
      timezone: timezone
    })
    res.json({
      mode: 'credentials',
      provider: 'bluesky',
      channel: result
    })
  } catch (error) {
    const message = error && error.message ? error.message : 'Could not connect Bluesky'
    const lower = message.toLowerCase()
    if (lower.indexOf('invalid credentials') !== -1) {
      return res.status(400).json({ error: 'Invalid Bluesky handle or app password' })
    }
    if (lower.indexOf('organization not found') !== -1) {
      return res.status(502).json({ error: 'Postiz connect state expired. Try again.' })
    }
    res.status(502).json({ error: message })
  }
})

router.post('/connect/api-key/:provider', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }

  const providerId = String(req.params.provider || '')
  const provider = findProvider(providerId)
  if (!provider || provider.mode !== 'api_key') {
    return res.status(400).json({ error: 'Unknown API key provider' })
  }

  const body = req.body || {}
  const apiKey = String(body.apiKey || '').trim()
  const timezone = body.timezone != null ? String(body.timezone) : String(-(new Date().getTimezoneOffset()))

  if (!apiKey) {
    return res.status(400).json({ error: provider.name + ' API key is required' })
  }

  try {
    const result = await connectApiKeyProvider(providerId, apiKey, timezone)
    res.json({
      mode: 'api_key',
      provider: providerId,
      channel: result
    })
  } catch (error) {
    const message = error && error.message ? error.message : 'Could not connect ' + provider.name
    const lower = message.toLowerCase()
    if (lower.indexOf('invalid credentials') !== -1) {
      if (providerId === 'hashnode') {
        return res.status(400).json({
          error:
            'Hashnode could not validate this key. Publishing via API requires a Hashnode Pro publication — free-tier PATs will not work. Check Billing → Upgrade to Pro, or regenerate your token.'
        })
      }
      return res.status(400).json({ error: 'Invalid ' + provider.name + ' API key' })
    }
    if (lower.indexOf('organization not found') !== -1) {
      return res.status(502).json({ error: 'Postiz connect state expired. Try again.' })
    }
    res.status(502).json({ error: message })
  }
})

router.get('/connect/:provider', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  const providerId = String(req.params.provider || '')
  const provider = findProvider(providerId)
  if (!provider) {
    return res.status(400).json({ error: 'Unknown provider' })
  }

  if (provider.mode === 'credentials' || provider.mode === 'api_key') {
    return res.status(400).json({
      error: 'Use the in-app form to connect ' + provider.name + '.',
      mode: provider.mode,
      provider: provider.id
    })
  }

  if (provider.mode === 'external') {
    return res.json({
      mode: 'external',
      provider: provider.id,
      url: getPostizAppUrl(),
      hint: provider.hint || 'Connect this channel in the Postiz dashboard.'
    })
  }

  try {
    const refreshId = req.query.refresh ? String(req.query.refresh) : null
    const data = await getConnectUrl(providerId, refreshId)
    if (!data || !data.url) {
      return res.status(502).json({ error: 'Postiz did not return a connect URL' })
    }
    res.json({
      mode: 'oauth',
      provider: provider.id,
      url: data.url
    })
  } catch (error) {
    res.status(502).json({
      error: 'Could not start connect for ' + provider.name + '. OAuth apps may not be configured in Postiz yet.'
    })
  }
})

router.get('/channels/:id/article-options', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }

  const channelId = String(req.params.id || '')
  const platform = String(req.query.platform || '')

  if (!isArticlePlatform(platform)) {
    return res.status(400).json({ error: 'Not an article platform' })
  }

  try {
    const publications = []
    const tags = []

    if (platform === 'hashnode') {
      try {
        const pubs = await triggerIntegrationTool(channelId, 'publications', {})
        const list = pubs && pubs.output ? pubs.output : pubs
        if (Array.isArray(list)) {
          let index = 0
          while (index < list.length) {
            publications.push({
              id: String(list[index].id || ''),
              name: String(list[index].name || list[index].title || list[index].id || '')
            })
            index = index + 1
          }
        }
      } catch (error) {
        // publication list optional — user can paste ID
      }

      try {
        const tagResult = await triggerIntegrationTool(channelId, 'tagsList', {})
        const list = tagResult && tagResult.output ? tagResult.output : tagResult
        if (Array.isArray(list)) {
          let index = 0
          while (index < list.length && index < 200) {
            const item = list[index]
            tags.push({
              value: String(item.objectID || item.value || item.id || ''),
              label: String(item.name || item.label || '')
            })
            index = index + 1
          }
        }
      } catch (error) {
        // tags optional
      }
    }

    if (platform === 'devto') {
      try {
        const tagResult = await triggerIntegrationTool(channelId, 'tags', {})
        const list = tagResult && tagResult.output ? tagResult.output : tagResult
        if (Array.isArray(list)) {
          let index = 0
          while (index < list.length && index < 200) {
            tags.push({
              value: String(list[index].value || list[index].id || list[index].name || ''),
              label: String(list[index].label || list[index].name || '')
            })
            index = index + 1
          }
        }
      } catch (error) {
        // tags optional
      }
    }

    res.json({ publications: publications, tags: tags })
  } catch (error) {
    res.status(502).json({ error: 'Could not load article options' })
  }
})

router.delete('/channels/:id', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  try {
    const result = await deleteIntegration(req.params.id)
    res.json(result)
  } catch (error) {
    res.status(502).json({ error: 'Could not disconnect channel in Postiz' })
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

  let requestChannels = []
  if (Array.isArray(body.channels) && body.channels.length > 0) {
    requestChannels = body.channels
  } else if (body.channelId) {
    requestChannels = [{ id: body.channelId, platform: body.platform }]
  }
  const articleError = validateArticleFields(body, requestChannels)
  if (articleError) {
    return res.status(400).json({ error: articleError })
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

import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { listIntegrations, createPost, listPosts, deletePost } from './postizClient.js'
import { resolvePostizCustomer } from './tenant.js'

const router = Router()

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

function buildPostEntries(body) {
  const content = body.content || ''
  let channels = []

  if (Array.isArray(body.channels) && body.channels.length > 0) {
    channels = body.channels
  } else if (body.channelId) {
    channels = [{ id: body.channelId, platform: body.platform }]
  }

  return channels.map(function (channel) {
    return {
      integration: { id: channel.id },
      value: [{ content: content, image: [] }],
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

router.post('/posts', async function (req, res) {
  if (!requireUser(req, res)) {
    return
  }
  const body = req.body
  const postEntries = buildPostEntries(body)
  if (postEntries.length === 0) {
    return res.status(400).json({ error: 'Select at least one channel' })
  }
  if (!body.content || !String(body.content).trim()) {
    return res.status(400).json({ error: 'Content is required' })
  }

  const postType = body.type === 'schedule' ? 'schedule' : 'now'
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

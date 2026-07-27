import { Router } from 'express'
import { getAuth } from '@clerk/express'
import { listIntegrations, createPost } from './postizClient.js'
import { resolvePostizCustomer } from './tenant.js'

const router = Router()

router.get('/channels', async function (req, res) {
  const auth = getAuth(req)
  if (!auth.userId) {
    return res.status(401).json({ error: 'Not signed in' })
  }
  try {
    resolvePostizCustomer(auth.userId)
    const integrations = await listIntegrations()
    const channels = integrations.map(function (item) {
      return { id: item.id, name: item.name, platform: item.identifier, picture: item.picture, disabled: item.disabled }
    })
    res.json({ channels: channels })
  } catch (error) {
    res.status(502).json({ error: 'Could not reach Postiz' })
  }
})

router.post('/posts', async function (req, res) {
  const auth = getAuth(req)
  if (!auth.userId) {
    return res.status(401).json({ error: 'Not signed in' })
  }
  const body = req.body
  const payload = {
    type: body.type,
    date: body.date,
    shortLink: false,
    tags: [],
    posts: [
      { integration: { id: body.channelId }, value: [{ content: body.content, image: [] }], settings: { __type: body.platform } }
    ]
  }
  try {
    const result = await createPost(payload)
    res.json(result)
  } catch (error) {
    res.status(502).json({ error: 'Could not create post in Postiz' })
  }
})

export default router

import 'dotenv/config'

const BASE_URL = process.env.POSTIZ_API_URL
const API_KEY = process.env.POSTIZ_API_KEY

function authHeaders() {
  return { Authorization: API_KEY, 'Content-Type': 'application/json' }
}

function authOnlyHeaders() {
  return { Authorization: API_KEY }
}

function postizApiRoot() {
  const base = String(BASE_URL || '').replace(/\/$/, '')
  return base.replace(/\/public\/v1\/?$/, '') || 'http://localhost:5000/api'
}

export async function listIntegrations() {
  const response = await fetch(BASE_URL + '/integrations', { method: 'GET', headers: authHeaders() })
  if (!response.ok) {
    throw new Error('Postiz integrations request failed: ' + response.status)
  }
  return response.json()
}

export async function createPost(payload) {
  const response = await fetch(BASE_URL + '/posts', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    throw new Error('Postiz create post failed: ' + response.status)
  }
  return response.json()
}

export async function listPosts(startDate, endDate) {
  const query = '?startDate=' + encodeURIComponent(startDate) + '&endDate=' + encodeURIComponent(endDate)
  const response = await fetch(BASE_URL + '/posts' + query, { method: 'GET', headers: authHeaders() })
  if (!response.ok) {
    throw new Error('Postiz list posts failed: ' + response.status)
  }
  return response.json()
}

export async function deletePost(postId) {
  const response = await fetch(BASE_URL + '/posts/' + encodeURIComponent(postId), {
    method: 'DELETE',
    headers: authHeaders()
  })
  if (!response.ok) {
    throw new Error('Postiz delete post failed: ' + response.status)
  }
  return response.json()
}

export async function uploadFile(fileBuffer, fileName, mimeType) {
  const form = new FormData()
  const blob = new Blob([fileBuffer], { type: mimeType || 'application/octet-stream' })
  form.append('file', blob, fileName || 'upload.bin')

  const response = await fetch(BASE_URL + '/upload', {
    method: 'POST',
    headers: authOnlyHeaders(),
    body: form
  })
  if (!response.ok) {
    throw new Error('Postiz upload failed: ' + response.status)
  }
  return response.json()
}

export async function getConnectUrl(providerId, refreshId) {
  let path = BASE_URL + '/social/' + encodeURIComponent(providerId)
  if (refreshId) {
    path = path + '?refresh=' + encodeURIComponent(refreshId)
  }
  const response = await fetch(path, { method: 'GET', headers: authHeaders() })
  if (!response.ok) {
    throw new Error('Postiz connect URL request failed: ' + response.status)
  }
  return response.json()
}

export async function deleteIntegration(integrationId) {
  const response = await fetch(BASE_URL + '/integrations/' + encodeURIComponent(integrationId), {
    method: 'DELETE',
    headers: authHeaders()
  })
  if (!response.ok) {
    throw new Error('Postiz delete integration failed: ' + response.status)
  }
  return response.json()
}

export async function connectBlueskyCredentials(input) {
  const identifier = String(input.identifier || '').trim().replace(/^@/, '')
  const password = String(input.password || '')
  const service = String(input.service || 'https://bsky.social').trim() || 'https://bsky.social'
  const timezone = String(input.timezone != null ? input.timezone : '0')

  if (!identifier) {
    throw new Error('Bluesky handle is required')
  }
  if (!password) {
    throw new Error('Bluesky app password is required')
  }

  return connectCustomFieldsProvider('bluesky', {
    service: service,
    identifier: identifier,
    password: password
  }, timezone)
}

export async function connectApiKeyProvider(providerId, apiKey, timezone) {
  const key = String(apiKey || '').trim()
  if (!key) {
    throw new Error('API key is required')
  }
  if (providerId !== 'devto' && providerId !== 'hashnode') {
    throw new Error('Unsupported API key provider')
  }
  return connectCustomFieldsProvider(providerId, { apiKey: key }, timezone)
}

async function connectCustomFieldsProvider(providerId, fields, timezone) {
  const start = await getConnectUrl(providerId)
  const state = start && start.url ? String(start.url) : ''
  if (!state) {
    throw new Error('Postiz did not return a connect state for ' + providerId)
  }

  const code = Buffer.from(JSON.stringify(fields)).toString('base64')
  const response = await fetch(
    postizApiRoot() + '/integrations/social-connect/' + encodeURIComponent(providerId),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        state: state,
        timezone: String(timezone != null ? timezone : '0')
      })
    }
  )

  let data = null
  try {
    data = await response.json()
  } catch (error) {
    data = null
  }

  if (!response.ok) {
    let message = providerId + ' connect failed (' + response.status + ')'
    if (data) {
      if (typeof data.msg === 'string' && data.msg) {
        message = data.msg
      } else if (typeof data.message === 'string' && data.message) {
        message = data.message
      } else if (typeof data.error === 'string' && data.error) {
        message = data.error
      } else if (Array.isArray(data.message) && data.message[0]) {
        message = String(data.message[0])
      }
    }
    throw new Error(message)
  }

  if (data && data.error) {
    throw new Error(String(data.error))
  }

  return data
}

export async function triggerIntegrationTool(integrationId, methodName, data) {
  const response = await fetch(BASE_URL + '/integration-trigger/' + encodeURIComponent(integrationId), {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      methodName: methodName,
      data: data || {}
    })
  })
  if (!response.ok) {
    throw new Error('Postiz tool request failed: ' + response.status)
  }
  return response.json()
}

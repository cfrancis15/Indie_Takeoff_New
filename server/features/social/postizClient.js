import 'dotenv/config'

const BASE_URL = process.env.POSTIZ_API_URL
const API_KEY = process.env.POSTIZ_API_KEY

function authHeaders() {
  return { Authorization: API_KEY, 'Content-Type': 'application/json' }
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

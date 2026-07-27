const API_BASE = 'http://localhost:3001/api/social'

export async function fetchChannels(token) {
  const response = await fetch(API_BASE + '/channels', { headers: { Authorization: 'Bearer ' + token } })
  if (!response.ok) {
    throw new Error('Failed to load channels')
  }
  return response.json()
}

export async function schedulePost(token, post) {
  const response = await fetch(API_BASE + '/posts', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(post)
  })
  if (!response.ok) {
    throw new Error('Failed to schedule post')
  }
  return response.json()
}

const API_BASE = 'http://localhost:3001/api/social'

function authHeaders(token) {
  return { Authorization: 'Bearer ' + token }
}

function authJsonHeaders(token) {
  return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
}

export async function fetchChannels(token) {
  const response = await fetch(API_BASE + '/channels', { headers: authHeaders(token) })
  if (!response.ok) {
    throw new Error('Failed to load channels')
  }
  return response.json()
}

export async function fetchPosts(token, startDate, endDate) {
  const query = '?startDate=' + encodeURIComponent(startDate) + '&endDate=' + encodeURIComponent(endDate)
  const response = await fetch(API_BASE + '/posts' + query, { headers: authHeaders(token) })
  if (!response.ok) {
    throw new Error('Failed to load posts')
  }
  return response.json()
}

export async function schedulePost(token, post) {
  const response = await fetch(API_BASE + '/posts', {
    method: 'POST',
    headers: authJsonHeaders(token),
    body: JSON.stringify(post)
  })
  if (!response.ok) {
    let message = 'Failed to schedule post'
    try {
      const data = await response.json()
      if (data && data.error) {
        message = data.error
      }
    } catch (error) {
      // keep default message
    }
    throw new Error(message)
  }
  return response.json()
}

export async function deletePost(token, postId) {
  const response = await fetch(API_BASE + '/posts/' + encodeURIComponent(postId), {
    method: 'DELETE',
    headers: authHeaders(token)
  })
  if (!response.ok) {
    throw new Error('Failed to delete post')
  }
  return response.json()
}

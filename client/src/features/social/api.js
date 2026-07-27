const API_BASE = 'http://localhost:3001/api/social'

function authHeaders(token) {
  return { Authorization: 'Bearer ' + token }
}

function authJsonHeaders(token) {
  return { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
}

async function readErrorMessage(response, fallback) {
  let message = fallback
  try {
    const data = await response.json()
    if (data && data.error) {
      message = data.error
    }
  } catch (error) {
    // keep default message
  }
  return message
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
    throw new Error(await readErrorMessage(response, 'Failed to schedule post'))
  }
  return response.json()
}

export async function deletePost(token, postId) {
  const response = await fetch(API_BASE + '/posts/' + encodeURIComponent(postId), {
    method: 'DELETE',
    headers: authHeaders(token)
  })
  if (!response.ok) {
    throw new Error('Failed to remove post from calendar')
  }
  return response.json()
}

export async function uploadImage(token, file) {
  const form = new FormData()
  form.append('file', file)

  const response = await fetch(API_BASE + '/upload', {
    method: 'POST',
    headers: authHeaders(token),
    body: form
  })
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to upload image'))
  }
  return response.json()
}

export async function generateCaption(token, input) {
  const response = await fetch(API_BASE + '/captions', {
    method: 'POST',
    headers: authJsonHeaders(token),
    body: JSON.stringify(input)
  })
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Failed to generate caption'))
  }
  return response.json()
}

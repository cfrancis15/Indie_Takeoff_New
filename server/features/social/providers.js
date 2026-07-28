export const CONNECTABLE_PROVIDERS = [
  {
    id: 'bluesky',
    name: 'Bluesky',
    mode: 'credentials',
    hint: 'Use your Bluesky handle and an app password (not your main password).'
  },
  { id: 'linkedin', name: 'LinkedIn', mode: 'oauth' },
  { id: 'reddit', name: 'Reddit', mode: 'oauth' }
]

export const MVP_PLATFORM_IDS = ['bluesky', 'linkedin', 'reddit']

export function findProvider(providerId) {
  let index = 0
  while (index < CONNECTABLE_PROVIDERS.length) {
    if (CONNECTABLE_PROVIDERS[index].id === providerId) {
      return CONNECTABLE_PROVIDERS[index]
    }
    index = index + 1
  }
  return null
}

export function isMvpPlatform(platformId) {
  let index = 0
  while (index < MVP_PLATFORM_IDS.length) {
    if (MVP_PLATFORM_IDS[index] === platformId) {
      return true
    }
    index = index + 1
  }
  return false
}

export function getPostizAppUrl() {
  if (process.env.POSTIZ_APP_URL && process.env.POSTIZ_APP_URL.trim()) {
    return process.env.POSTIZ_APP_URL.trim().replace(/\/$/, '')
  }
  const apiUrl = process.env.POSTIZ_API_URL || ''
  const stripped = apiUrl.replace(/\/api\/public\/v1\/?$/, '')
  if (stripped) {
    return stripped
  }
  return 'http://localhost:5000'
}

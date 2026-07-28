export const CONNECTABLE_PROVIDERS = [
  {
    id: 'bluesky',
    name: 'Bluesky',
    mode: 'credentials',
    hint: 'Use your Bluesky handle and an app password (not your main password).'
  },
  { id: 'linkedin', name: 'LinkedIn', mode: 'oauth' },
  {
    id: 'devto',
    name: 'Dev.to',
    mode: 'api_key',
    hint: 'Paste a Dev.to API key from Settings → Extensions → DEV Community API Keys.'
  },
  {
    id: 'hashnode',
    name: 'Hashnode',
    mode: 'api_key',
    hint: 'Paste a Hashnode Personal Access Token. API publishing requires a Hashnode Pro publication (free-tier tokens will not work).'
  },
  {
    id: 'mastodon',
    name: 'Mastodon',
    mode: 'oauth',
    hint: 'Connects to the Mastodon instance configured in Postiz (default: mastodon.social).'
  }
]

export const MVP_PLATFORM_IDS = ['bluesky', 'linkedin', 'devto', 'hashnode', 'mastodon']

export const ARTICLE_PLATFORM_IDS = ['devto', 'hashnode']

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

export function isArticlePlatform(platformId) {
  let index = 0
  while (index < ARTICLE_PLATFORM_IDS.length) {
    if (ARTICLE_PLATFORM_IDS[index] === platformId) {
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

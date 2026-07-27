import 'dotenv/config'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const MAX_PROMPT_CHARS = 500
const MAX_CAPTION_CHARS = 300

export function isCaptionAssistConfigured() {
  return !!(OPENAI_API_KEY && OPENAI_API_KEY.trim())
}

function buildPrompt(input) {
  const platforms = Array.isArray(input.platforms) ? input.platforms : []
  const platformLabel = platforms.length > 0 ? platforms.join(', ') : 'social media'
  const tone = input.tone === 'professional' ? 'professional' : 'friendly and natural'
  const draft = input.draft ? String(input.draft).trim() : ''
  const topic = input.topic ? String(input.topic).trim() : ''

  let seed = ''
  if (draft) {
    seed = 'Improve or rewrite this draft caption:\n' + draft
  } else if (topic) {
    seed = 'Write a caption about: ' + topic
  } else {
    seed = 'Write a short engaging social media caption.'
  }

  return [
    'You write short social media captions.',
    'Tone: ' + tone + '.',
    'Target platforms: ' + platformLabel + '.',
    'Keep it under ' + MAX_CAPTION_CHARS + ' characters.',
    'No hashtag spam (at most 3 hashtags).',
    'Return only the caption text, nothing else.',
    '',
    seed
  ].join('\n')
}

export async function generateCaption(input) {
  if (!isCaptionAssistConfigured()) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const topic = input.topic ? String(input.topic).trim() : ''
  const draft = input.draft ? String(input.draft).trim() : ''
  if (topic.length > MAX_PROMPT_CHARS || draft.length > MAX_PROMPT_CHARS) {
    throw new Error('Prompt is too long (max ' + MAX_PROMPT_CHARS + ' characters)')
  }

  const prompt = buildPrompt(input)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + OPENAI_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.8,
      max_tokens: 200,
      messages: [
        { role: 'system', content: 'You are a concise social media copywriter.' },
        { role: 'user', content: prompt }
      ]
    })
  })

  if (!response.ok) {
    throw new Error('OpenAI request failed: ' + response.status)
  }

  const data = await response.json()
  const choice = data && data.choices && data.choices[0]
  const message = choice && choice.message
  let caption = message && message.content ? String(message.content).trim() : ''

  if (!caption) {
    throw new Error('OpenAI returned an empty caption')
  }

  if (caption.length > MAX_CAPTION_CHARS) {
    caption = caption.slice(0, MAX_CAPTION_CHARS).trim()
  }

  return { caption: caption }
}

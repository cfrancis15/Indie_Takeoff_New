import { useState } from 'react'
import { generateCaption, schedulePost, uploadImage } from './api.js'
import { toDateTimeLocalValue } from './dateUtils.js'
import {
  MAX_IMAGE_ITEMS,
  acceptAttribute,
  validateLocalImage
} from './mediaRules.js'

export default function Composer(props) {
  const channels = props.channels || []
  const onSubmitted = props.onSubmitted
  const getToken = props.getToken

  const [selectedIds, setSelectedIds] = useState([])
  const [content, setContent] = useState('')
  const [captionTopic, setCaptionTopic] = useState('')
  const [captionTone, setCaptionTone] = useState('friendly')
  const [postType, setPostType] = useState('now')
  const [scheduleAt, setScheduleAt] = useState(toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)))
  const [images, setImages] = useState([])
  const [redditSubreddit, setRedditSubreddit] = useState('')
  const [redditTitle, setRedditTitle] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [generatingCaption, setGeneratingCaption] = useState(false)

  function isSelected(channelId) {
    return selectedIds.indexOf(channelId) !== -1
  }

  function toggleChannel(channelId) {
    if (isSelected(channelId)) {
      const next = []
      let index = 0
      while (index < selectedIds.length) {
        if (selectedIds[index] !== channelId) {
          next.push(selectedIds[index])
        }
        index = index + 1
      }
      setSelectedIds(next)
      return
    }
    setSelectedIds(selectedIds.concat([channelId]))
  }

  function selectedChannels() {
    const picked = []
    let index = 0
    while (index < channels.length) {
      const channel = channels[index]
      if (isSelected(channel.id) && !channel.disabled) {
        picked.push(channel)
      }
      index = index + 1
    }
    return picked
  }

  function selectionIncludesReddit() {
    const picked = selectedChannels()
    let index = 0
    while (index < picked.length) {
      if (picked[index].platform === 'reddit') {
        return true
      }
      index = index + 1
    }
    return false
  }

  function removeImage(imageId) {
    const next = []
    let index = 0
    while (index < images.length) {
      const item = images[index]
      if (item.id !== imageId) {
        next.push(item)
      } else if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
      index = index + 1
    }
    setImages(next)
  }

  async function handleFileChange(event) {
    const files = event.target.files
    if (!files || files.length === 0) {
      return
    }

    const file = files[0]
    event.target.value = ''

    const validationError = validateLocalImage(file, images)
    if (validationError) {
      setStatus(validationError)
      return
    }

    setUploading(true)
    setStatus('Uploading image…')

    try {
      const token = await getToken()
      const uploaded = await uploadImage(token, file)
      setImages(images.concat([{
        id: uploaded.id,
        path: uploaded.path,
        name: uploaded.name || file.name,
        previewUrl: URL.createObjectURL(file)
      }]))
      setStatus('Image attached')
    } catch (error) {
      setStatus(error.message || 'Failed to upload image')
    }

    setUploading(false)
  }

  async function handleGenerateCaption() {
    const picked = selectedChannels()
    const topic = captionTopic.trim()
    const draft = content.trim()
    if (!topic && !draft) {
      setStatus('Add a topic or draft text for AI caption assist')
      return
    }

    setGeneratingCaption(true)
    setStatus('Generating caption…')

    const platforms = []
    let index = 0
    while (index < picked.length) {
      platforms.push(picked[index].platform)
      index = index + 1
    }

    try {
      const token = await getToken()
      const result = await generateCaption(token, {
        topic: topic,
        draft: draft,
        tone: captionTone,
        platforms: platforms
      })
      setContent(result.caption || '')
      setStatus('Caption generated — edit if you want, then post')
    } catch (error) {
      setStatus(error.message || 'Failed to generate caption')
    }

    setGeneratingCaption(false)
  }

  async function handleSubmit() {
    const picked = selectedChannels()
    if (picked.length === 0) {
      setStatus('Pick at least one channel')
      return
    }
    if (!content.trim() && images.length === 0) {
      setStatus('Add text or an image before posting')
      return
    }
    if (postType === 'schedule' && !scheduleAt) {
      setStatus('Pick a schedule time')
      return
    }
    if (postType === 'schedule') {
      const scheduled = new Date(scheduleAt)
      if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
        setStatus('Schedule time must be in the future')
        return
      }
    }
    if (selectionIncludesReddit()) {
      const sub = redditSubreddit.replace(/^r\//i, '').trim()
      if (sub.length < 2) {
        setStatus('Reddit needs a subreddit (without r/)')
        return
      }
      if (redditTitle.trim().length < 2) {
        setStatus('Reddit needs a post title')
        return
      }
    }

    setBusy(true)
    setStatus('')

    const dateValue = postType === 'schedule' ? new Date(scheduleAt).toISOString() : new Date().toISOString()
    const channelPayload = []
    let index = 0
    while (index < picked.length) {
      channelPayload.push({ id: picked[index].id, platform: picked[index].platform })
      index = index + 1
    }

    const imagePayload = []
    index = 0
    while (index < images.length) {
      imagePayload.push({ id: images[index].id, path: images[index].path })
      index = index + 1
    }

    const payload = {
      type: postType,
      date: dateValue,
      content: content,
      channels: channelPayload,
      images: imagePayload,
      redditSubreddit: redditSubreddit,
      redditTitle: redditTitle
    }

    try {
      const token = await getToken()
      await schedulePost(token, payload)
      setStatus(postType === 'schedule' ? 'Post scheduled' : 'Post sent')
      setContent('')
      index = 0
      while (index < images.length) {
        if (images[index].previewUrl) {
          URL.revokeObjectURL(images[index].previewUrl)
        }
        index = index + 1
      }
      setImages([])
      if (onSubmitted) {
        onSubmitted()
      }
    } catch (error) {
      setStatus(error.message || 'Failed to send post')
    }

    setBusy(false)
  }

  return (
    <section className="social-panel">
      <h2>Compose</h2>
      <p className="social-help">Choose Bluesky, LinkedIn, and/or Reddit, add text and optional images, then post or schedule.</p>

      <h3>Channels</h3>
      {channels.length === 0 ? (
        <p>No channels yet. Connect Bluesky, LinkedIn, or Reddit under the Channels tab.</p>
      ) : (
        <ul className="channel-list">
          {channels.map(function (channel) {
            const checked = isSelected(channel.id)
            return (
              <li key={channel.id} className="channel-item">
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!!channel.disabled}
                    onChange={function () { toggleChannel(channel.id) }}
                  />
                  <span>{channel.name} ({channel.platform})</span>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      {selectionIncludesReddit() ? (
        <div className="reddit-fields">
          <h3>Reddit</h3>
          <p className="social-help">Required when Reddit is selected. Subreddit without the r/ prefix.</p>
          <div className="schedule-field">
            <label htmlFor="redditSubreddit">Subreddit</label>
            <input
              id="redditSubreddit"
              type="text"
              value={redditSubreddit}
              onChange={function (event) { setRedditSubreddit(event.target.value) }}
              placeholder="e.g. sideproject"
              disabled={busy}
            />
          </div>
          <div className="schedule-field">
            <label htmlFor="redditTitle">Title</label>
            <input
              id="redditTitle"
              type="text"
              value={redditTitle}
              onChange={function (event) { setRedditTitle(event.target.value) }}
              placeholder="Post title"
              disabled={busy}
            />
          </div>
        </div>
      ) : null}

      <h3>Content</h3>
      <div className="caption-assist">
        <label htmlFor="captionTopic">AI topic (optional if you already have draft text)</label>
        <input
          id="captionTopic"
          type="text"
          value={captionTopic}
          onChange={function (event) { setCaptionTopic(event.target.value) }}
          placeholder="e.g. launch announcement for our new automation tool"
          disabled={generatingCaption || busy}
        />
        <div className="when-options">
          <label>
            <input
              type="radio"
              name="captionTone"
              checked={captionTone === 'friendly'}
              onChange={function () { setCaptionTone('friendly') }}
            />
            Friendly
          </label>
          <label>
            <input
              type="radio"
              name="captionTone"
              checked={captionTone === 'professional'}
              onChange={function () { setCaptionTone('professional') }}
            />
            Professional
          </label>
        </div>
        <button
          type="button"
          onClick={handleGenerateCaption}
          disabled={generatingCaption || busy || uploading}
        >
          {generatingCaption ? 'Generating…' : 'Generate AI caption'}
        </button>
      </div>
      <textarea
        className="compose-input"
        value={content}
        onChange={function (event) { setContent(event.target.value) }}
        rows={6}
        placeholder="What do you want to post?"
      />
      <p className="char-count">{content.length} characters</p>

      <h3>Images</h3>
      <p className="social-help">Up to {MAX_IMAGE_ITEMS} images, 10 MB each. JPG, PNG, GIF, or WebP.</p>
      <input
        type="file"
        accept={acceptAttribute()}
        disabled={uploading || busy || images.length >= MAX_IMAGE_ITEMS}
        onChange={handleFileChange}
      />

      {images.length > 0 ? (
        <ul className="media-list">
          {images.map(function (item) {
            return (
              <li key={item.id} className="media-item">
                <img className="media-preview" src={item.previewUrl || item.path} alt={item.name || 'attachment'} />
                <div className="media-meta">
                  <span>{item.name || item.id}</span>
                </div>
                <button type="button" onClick={function () { removeImage(item.id) }} disabled={busy}>
                  Remove
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <h3>When</h3>
      <div className="when-options">
        <label>
          <input
            type="radio"
            name="postType"
            checked={postType === 'now'}
            onChange={function () { setPostType('now') }}
          />
          Post now
        </label>
        <label>
          <input
            type="radio"
            name="postType"
            checked={postType === 'schedule'}
            onChange={function () { setPostType('schedule') }}
          />
          Schedule
        </label>
      </div>

      {postType === 'schedule' ? (
        <div className="schedule-field">
          <label htmlFor="scheduleAt">Schedule time</label>
          <input
            id="scheduleAt"
            type="datetime-local"
            value={scheduleAt}
            onChange={function (event) { setScheduleAt(event.target.value) }}
          />
        </div>
      ) : null}

      <div className="compose-actions">
        <button type="button" onClick={handleSubmit} disabled={busy || uploading || generatingCaption}>
          {busy ? 'Sending…' : (uploading ? 'Uploading…' : (postType === 'schedule' ? 'Schedule post' : 'Post now'))}
        </button>
      </div>

      {status ? <p className="social-status">{status}</p> : null}
    </section>
  )
}

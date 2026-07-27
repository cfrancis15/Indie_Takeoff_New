import { useState } from 'react'
import { schedulePost } from './api.js'
import { toDateTimeLocalValue } from './dateUtils.js'

export default function Composer(props) {
  const channels = props.channels || []
  const onSubmitted = props.onSubmitted
  const getToken = props.getToken

  const [selectedIds, setSelectedIds] = useState([])
  const [content, setContent] = useState('')
  const [postType, setPostType] = useState('now')
  const [scheduleAt, setScheduleAt] = useState(toDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)))
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

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

  async function handleSubmit() {
    const picked = selectedChannels()
    if (picked.length === 0) {
      setStatus('Pick at least one channel')
      return
    }
    if (!content.trim()) {
      setStatus('Write some content first')
      return
    }
    if (postType === 'schedule' && !scheduleAt) {
      setStatus('Pick a schedule time')
      return
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

    const payload = {
      type: postType,
      date: dateValue,
      content: content,
      channels: channelPayload
    }

    try {
      const token = await getToken()
      await schedulePost(token, payload)
      setStatus(postType === 'schedule' ? 'Post scheduled' : 'Post sent')
      setContent('')
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
      <p className="social-help">Choose channels, write your post, then send now or schedule.</p>

      <h3>Channels</h3>
      {channels.length === 0 ? (
        <p>No channels yet. Connect one in the Postiz dashboard for now.</p>
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

      <h3>Content</h3>
      <textarea
        className="compose-input"
        value={content}
        onChange={function (event) { setContent(event.target.value) }}
        rows={6}
        placeholder="What do you want to post?"
      />
      <p className="char-count">{content.length} characters</p>

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
        <button type="button" onClick={handleSubmit} disabled={busy}>
          {busy ? 'Sending…' : (postType === 'schedule' ? 'Schedule post' : 'Post now')}
        </button>
      </div>

      {status ? <p className="social-status">{status}</p> : null}
    </section>
  )
}

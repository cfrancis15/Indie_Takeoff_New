import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/react'
import { fetchChannels, schedulePost } from './api.js'

export default function SocialPage() {
  const { getToken } = useAuth()
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('')

  useEffect(function () {
    async function loadChannels() {
      const token = await getToken()
      try {
        const data = await fetchChannels(token)
        setChannels(data.channels)
      } catch (error) {
        setStatus('Could not load channels')
      }
    }
    loadChannels()
  }, [])

  async function handleSubmit() {
    if (!selectedChannel) {
      setStatus('Pick a channel first')
      return
    }
    const token = await getToken()
    const post = { type: 'now', date: new Date().toISOString(), channelId: selectedChannel.id, platform: selectedChannel.platform, content: content }
    try {
      await schedulePost(token, post)
      setStatus('Post sent to Postiz')
      setContent('')
    } catch (error) {
      setStatus('Failed to send post')
    }
  }

  return (
    <section>
      <h1>Social</h1>
      <h2>Connected channels</h2>
      {channels.length === 0 ? (
        <p>No channels yet. Connect one in the Postiz dashboard for now.</p>
      ) : (
        <ul>
          {channels.map(function (channel) {
            return (
              <li key={channel.id}>
                <button type="button" onClick={function () { setSelectedChannel(channel) }}>
                  {channel.name} ({channel.platform}){selectedChannel && selectedChannel.id === channel.id ? ' — selected' : ''}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <h2>Compose</h2>
      <textarea value={content} onChange={function (event) { setContent(event.target.value) }} rows={4} placeholder="What do you want to post?" />
      <div><button type="button" onClick={handleSubmit}>Post now</button></div>
      {status ? <p>{status}</p> : null}
    </section>
  )
}

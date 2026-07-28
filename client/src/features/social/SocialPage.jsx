import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { fetchChannels } from './api.js'
import Composer from './Composer.jsx'
import Calendar from './Calendar.jsx'
import Channels from './Channels.jsx'

export default function SocialPage() {
  const { getToken } = useAuth()
  const [channels, setChannels] = useState([])
  const [tab, setTab] = useState('compose')
  const [status, setStatus] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(function () {
    async function loadChannels() {
      try {
        const token = await getToken()
        const data = await fetchChannels(token)
        setChannels(data.channels || [])
      } catch (error) {
        setStatus('Could not load channels')
      }
    }
    loadChannels()
  }, [])

  function handleSubmitted() {
    setRefreshKey(refreshKey + 1)
    setTab('calendar')
  }

  function handleChannelsChanged(nextChannels) {
    setChannels(nextChannels)
    setStatus('')
  }

  return (
    <section className="social-page">
      <h1>Social</h1>
      <p className="social-help">Create posts and manage your publishing calendar.</p>

      <div className="social-tabs">
        <button
          type="button"
          className={tab === 'compose' ? 'tab active' : 'tab'}
          onClick={function () { setTab('compose') }}
        >
          Compose
        </button>
        <button
          type="button"
          className={tab === 'calendar' ? 'tab active' : 'tab'}
          onClick={function () { setTab('calendar') }}
        >
          Calendar
        </button>
        <button
          type="button"
          className={tab === 'channels' ? 'tab active' : 'tab'}
          onClick={function () { setTab('channels') }}
        >
          Channels
        </button>
      </div>

      {status ? <p className="social-status">{status}</p> : null}

      {tab === 'compose' ? (
        <Composer channels={channels} getToken={getToken} onSubmitted={handleSubmitted} />
      ) : null}
      {tab === 'calendar' ? (
        <Calendar getToken={getToken} refreshKey={refreshKey} />
      ) : null}
      {tab === 'channels' ? (
        <Channels getToken={getToken} onChannelsChanged={handleChannelsChanged} />
      ) : null}
    </section>
  )
}

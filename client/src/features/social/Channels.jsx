import { useEffect, useState } from 'react'
import {
  fetchChannels,
  fetchProviders,
  startConnect,
  connectBluesky,
  connectApiKeyProvider,
  disconnectChannel
} from './api.js'

export default function Channels(props) {
  const getToken = props.getToken
  const onChannelsChanged = props.onChannelsChanged

  const [channels, setChannels] = useState([])
  const [providers, setProviders] = useState([])
  const [status, setStatus] = useState('')
  const [busyId, setBusyId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showBlueskyForm, setShowBlueskyForm] = useState(false)
  const [blueskyHandle, setBlueskyHandle] = useState('')
  const [blueskyPassword, setBlueskyPassword] = useState('')
  const [blueskyService, setBlueskyService] = useState('https://bsky.social')
  const [apiKeyProvider, setApiKeyProvider] = useState(null)
  const [apiKeyValue, setApiKeyValue] = useState('')

  async function loadAll() {
    setLoading(true)
    setStatus('')
    try {
      const token = await getToken()
      const channelsData = await fetchChannels(token)
      const providersData = await fetchProviders(token)
      setChannels(channelsData.channels || [])
      setProviders(providersData.providers || [])
      if (onChannelsChanged) {
        onChannelsChanged(channelsData.channels || [])
      }
    } catch (error) {
      setStatus('Could not load channels')
    }
    setLoading(false)
  }

  useEffect(function () {
    loadAll()
  }, [])

  function connectedPlatforms() {
    const map = {}
    let index = 0
    while (index < channels.length) {
      const platform = channels[index].platform
      if (platform) {
        map[platform] = true
      }
      index = index + 1
    }
    return map
  }

  async function handleConnect(provider) {
    if (provider.mode === 'credentials' && provider.id === 'bluesky') {
      setShowBlueskyForm(true)
      setApiKeyProvider(null)
      setStatus('')
      return
    }

    if (provider.mode === 'api_key') {
      setApiKeyProvider(provider)
      setApiKeyValue('')
      setShowBlueskyForm(false)
      setStatus('')
      return
    }

    setBusyId(provider.id)
    setStatus('')
    try {
      const token = await getToken()
      const data = await startConnect(token, provider.id)
      if (data.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
        setStatus('Complete sign-in in the new window, then refresh.')
      }
    } catch (error) {
      setStatus(error.message || 'Could not start connect')
    }
    setBusyId('')
  }

  async function handleBlueskySubmit(event) {
    event.preventDefault()
    setBusyId('bluesky')
    setStatus('')
    try {
      const token = await getToken()
      await connectBluesky(token, {
        identifier: blueskyHandle,
        password: blueskyPassword,
        service: blueskyService || 'https://bsky.social',
        timezone: String(-(new Date().getTimezoneOffset()))
      })
      setStatus('Bluesky connected')
      setShowBlueskyForm(false)
      setBlueskyHandle('')
      setBlueskyPassword('')
      await loadAll()
    } catch (error) {
      setStatus(error.message || 'Could not connect Bluesky')
    }
    setBusyId('')
  }

  async function handleApiKeySubmit(event) {
    event.preventDefault()
    if (!apiKeyProvider) {
      return
    }
    setBusyId(apiKeyProvider.id)
    setStatus('')
    try {
      const token = await getToken()
      await connectApiKeyProvider(token, apiKeyProvider.id, {
        apiKey: apiKeyValue,
        timezone: String(-(new Date().getTimezoneOffset()))
      })
      setStatus(apiKeyProvider.name + ' connected')
      setApiKeyProvider(null)
      setApiKeyValue('')
      await loadAll()
    } catch (error) {
      setStatus(error.message || 'Could not connect ' + apiKeyProvider.name)
    }
    setBusyId('')
  }

  async function handleDisconnect(channel) {
    if (!window.confirm('Disconnect ' + (channel.name || channel.platform) + '?')) {
      return
    }
    setBusyId(channel.id)
    setStatus('')
    try {
      const token = await getToken()
      await disconnectChannel(token, channel.id)
      setStatus('Disconnected ' + (channel.name || channel.platform))
      await loadAll()
    } catch (error) {
      setStatus(error.message || 'Could not disconnect')
    }
    setBusyId('')
  }

  const connected = connectedPlatforms()

  return (
    <div className="social-panel channels-panel">
      <div className="channels-header">
        <h2>Channels</h2>
        <button type="button" className="channels-refresh" onClick={loadAll} disabled={loading}>
          Refresh
        </button>
      </div>
      <p className="social-help">
        MVP: Bluesky, LinkedIn, Mastodon, Dev.to, and Hashnode. Blog platforms connect with an API key.
      </p>

      {status ? <p className="social-status">{status}</p> : null}
      {loading ? <p>Loading…</p> : null}

      <h3>Connected</h3>
      {channels.length === 0 && !loading ? (
        <p className="channels-empty">No channels connected yet.</p>
      ) : (
        <ul className="channels-list">
          {channels.map(function (channel) {
            return (
              <li key={channel.id} className="channels-row">
                <div className="channels-meta">
                  {channel.picture ? (
                    <img className="channels-avatar" src={channel.picture} alt="" />
                  ) : (
                    <span className="channels-avatar placeholder" />
                  )}
                  <div>
                    <strong>{channel.name || channel.platform}</strong>
                    <div className="channels-platform">{channel.platform}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="channels-disconnect"
                  disabled={busyId === channel.id}
                  onClick={function () { handleDisconnect(channel) }}
                >
                  Disconnect
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <h3>Add a channel</h3>
      <ul className="channels-list providers-list">
        {providers.map(function (provider) {
          const already = connected[provider.id]
          return (
            <li key={provider.id} className="channels-row">
              <div className="channels-meta">
                <div>
                  <strong>{provider.name}</strong>
                  {provider.hint ? (
                    <div className="channels-hint">{provider.hint}</div>
                  ) : null}
                  {already ? <div className="channels-hint">Already connected</div> : null}
                </div>
              </div>
              <button
                type="button"
                disabled={busyId === provider.id || already}
                onClick={function () { handleConnect(provider) }}
              >
                Connect
              </button>
            </li>
          )
        })}
      </ul>

      {showBlueskyForm ? (
        <form className="credential-connect-form" onSubmit={handleBlueskySubmit}>
          <h3>Connect Bluesky</h3>
          <p className="channels-hint">
            Create an app password in Bluesky → Settings → Privacy and security → App Passwords.
          </p>
          <label className="credential-field">
            <span>Handle</span>
            <input
              type="text"
              value={blueskyHandle}
              onChange={function (event) { setBlueskyHandle(event.target.value) }}
              placeholder="you.bsky.social"
              autoComplete="username"
              required
            />
          </label>
          <label className="credential-field">
            <span>App password</span>
            <input
              type="password"
              value={blueskyPassword}
              onChange={function (event) { setBlueskyPassword(event.target.value) }}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              autoComplete="current-password"
              required
            />
          </label>
          <label className="credential-field">
            <span>Service (optional)</span>
            <input
              type="url"
              value={blueskyService}
              onChange={function (event) { setBlueskyService(event.target.value) }}
              placeholder="https://bsky.social"
            />
          </label>
          <div className="credential-actions">
            <button type="submit" disabled={busyId === 'bluesky'}>
              {busyId === 'bluesky' ? 'Connecting…' : 'Connect Bluesky'}
            </button>
            <button
              type="button"
              className="channels-cancel"
              disabled={busyId === 'bluesky'}
              onClick={function () {
                setShowBlueskyForm(false)
                setBlueskyPassword('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {apiKeyProvider ? (
        <form className="credential-connect-form" onSubmit={handleApiKeySubmit}>
          <h3>Connect {apiKeyProvider.name}</h3>
          <p className="channels-hint">{apiKeyProvider.hint}</p>
          <label className="credential-field">
            <span>API key</span>
            <input
              type="password"
              value={apiKeyValue}
              onChange={function (event) { setApiKeyValue(event.target.value) }}
              placeholder="Paste API key"
              autoComplete="off"
              required
            />
          </label>
          <div className="credential-actions">
            <button type="submit" disabled={busyId === apiKeyProvider.id}>
              {busyId === apiKeyProvider.id ? 'Connecting…' : 'Connect ' + apiKeyProvider.name}
            </button>
            <button
              type="button"
              className="channels-cancel"
              disabled={busyId === apiKeyProvider.id}
              onClick={function () {
                setApiKeyProvider(null)
                setApiKeyValue('')
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

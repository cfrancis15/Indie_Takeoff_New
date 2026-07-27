import { useEffect, useState } from 'react'
import { deletePost, fetchPosts } from './api.js'
import { buildCalendarCells, formatPostTime, getMonthRange, monthLabel, toDateKey } from './dateUtils.js'

export default function Calendar(props) {
  const getToken = props.getToken
  const refreshKey = props.refreshKey

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [posts, setPosts] = useState([])
  const [selectedDateKey, setSelectedDateKey] = useState(toDateKey(today))
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadPosts() {
    setBusy(true)
    setStatus('')
    const range = getMonthRange(year, month)
    try {
      const token = await getToken()
      const data = await fetchPosts(token, range.startDate, range.endDate)
      setPosts(data.posts || [])
    } catch (error) {
      setStatus('Could not load calendar posts')
      setPosts([])
    }
    setBusy(false)
  }

  useEffect(function () {
    loadPosts()
  }, [year, month, refreshKey])

  function goPrevMonth() {
    if (month === 0) {
      setYear(year - 1)
      setMonth(11)
      return
    }
    setMonth(month - 1)
  }

  function goNextMonth() {
    if (month === 11) {
      setYear(year + 1)
      setMonth(0)
      return
    }
    setMonth(month + 1)
  }

  function postsForDate(dateKey) {
    const matched = []
    let index = 0
    while (index < posts.length) {
      const post = posts[index]
      if (post.publishDate) {
        const key = toDateKey(new Date(post.publishDate))
        if (key === dateKey) {
          matched.push(post)
        }
      }
      index = index + 1
    }
    return matched
  }

  function countForDate(dateKey) {
    return postsForDate(dateKey).length
  }

  async function handleDelete(postId) {
    setStatus('')
    try {
      const token = await getToken()
      await deletePost(token, postId)
      setStatus('Removed from calendar')
      loadPosts()
    } catch (error) {
      setStatus('Could not remove from calendar')
    }
  }

  const cells = buildCalendarCells(year, month)
  const selectedPosts = postsForDate(selectedDateKey)

  return (
    <section className="social-panel">
      <h2>Calendar</h2>
      <p className="social-help">Scheduled and published posts for the selected month. Removing a post clears it from this calendar only — it will not delete it from the social network.</p>

      <div className="calendar-nav">
        <button type="button" onClick={goPrevMonth}>Previous</button>
        <strong>{monthLabel(year, month)}</strong>
        <button type="button" onClick={goNextMonth}>Next</button>
      </div>

      {busy ? <p>Loading posts…</p> : null}

      <div className="calendar-grid">
        <div className="calendar-weekday">Sun</div>
        <div className="calendar-weekday">Mon</div>
        <div className="calendar-weekday">Tue</div>
        <div className="calendar-weekday">Wed</div>
        <div className="calendar-weekday">Thu</div>
        <div className="calendar-weekday">Fri</div>
        <div className="calendar-weekday">Sat</div>
        {cells.map(function (cell) {
          if (!cell.day) {
            return <div key={cell.key} className="calendar-cell empty" />
          }
          const count = countForDate(cell.dateKey)
          const selected = cell.dateKey === selectedDateKey
          let className = 'calendar-cell'
          if (selected) {
            className = className + ' selected'
          }
          if (count > 0) {
            className = className + ' has-posts'
          }
          return (
            <button
              key={cell.key}
              type="button"
              className={className}
              onClick={function () { setSelectedDateKey(cell.dateKey) }}
            >
              <span className="calendar-day">{cell.day}</span>
              {count > 0 ? <span className="calendar-count">{count}</span> : null}
            </button>
          )
        })}
      </div>

      <div className="calendar-day-detail">
        <h3>Posts on {selectedDateKey}</h3>
        {selectedPosts.length === 0 ? (
          <p>No posts on this day.</p>
        ) : (
          <ul className="post-list">
            {selectedPosts.map(function (post) {
              return (
                <li key={post.id} className="post-item">
                  <div className="post-meta">
                    <strong>{post.channelName || 'Channel'}</strong>
                    <span> · {post.platform || 'unknown'}</span>
                    <span> · {post.state || 'UNKNOWN'}</span>
                    <span> · {formatPostTime(post.publishDate)}</span>
                  </div>
                  <p className="post-content">{post.content}</p>
                  {post.releaseURL ? (
                    <p><a href={post.releaseURL} target="_blank" rel="noreferrer">View live</a></p>
                  ) : null}
                  <button type="button" onClick={function () { handleDelete(post.id) }}>Remove from calendar</button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {status ? <p className="social-status">{status}</p> : null}
    </section>
  )
}

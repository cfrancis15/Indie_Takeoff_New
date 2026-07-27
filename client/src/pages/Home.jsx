import { Navigate } from 'react-router-dom'
import { Show } from '@clerk/react'

export default function Home() {
  return (
    <Show
      when="signed-in"
      fallback={
        <section className="hero">
          <h1>Indie Takeoff</h1>
          <p>One dashboard for all your marketing channels.</p>
          <p>Sign in to get started.</p>
        </section>
      }
    >
      <Navigate to="/dashboard" replace />
    </Show>
  )
}

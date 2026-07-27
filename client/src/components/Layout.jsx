import { Link, Outlet } from 'react-router-dom'
import { Show, SignInButton, UserButton } from '@clerk/react'

export default function Layout() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">Indie Takeoff</Link>
        <nav className="app-nav">
          <Show when="signed-in">
            <Link to="/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/dashboard/cold-email" className="nav-link">Cold Email</Link>
            <Link to="/dashboard/physical-mail" className="nav-link">Physical Mail</Link>
            <Link to="/dashboard/social" className="nav-link">Social</Link>
            <Link to="/dashboard/newsletter" className="nav-link">Newsletter</Link>
            <Link to="/dashboard/prospecting" className="nav-link">Prospecting</Link>
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal" />
          </Show>
        </nav>
      </header>
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}

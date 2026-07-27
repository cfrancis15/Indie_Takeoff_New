import { Outlet } from 'react-router-dom'
import { Show, RedirectToSignIn } from '@clerk/react'

export default function ProtectedOutlet() {
  return (
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
      <Outlet />
    </Show>
  )
}

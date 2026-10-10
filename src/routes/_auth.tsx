import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { useAuthDialogStore } from '@/stores/auth-dialog'

// TODO: replace with real session check once auth exists
function isAuthenticated() {
  return true
}

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      // there is no login page: show the login modal over the home page, and
      // come back here once signed in
      useAuthDialogStore
        .getState()
        .openAuth('login', { redirectTo: location.href })
      throw redirect({ to: '/' })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <>
      <header>{/* TODO: site header */}</header>
      <main>
        <Outlet />
      </main>
      <footer>{/* TODO: site footer */}</footer>
    </>
  )
}

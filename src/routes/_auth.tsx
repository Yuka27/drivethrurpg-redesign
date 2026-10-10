import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
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

/** Same shell as _site: header, page, footer. */
function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}

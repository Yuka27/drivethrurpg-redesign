import {
  Navigate,
  Outlet,
  createFileRoute,
  redirect,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { meQueryOptions, useMe } from '@/api/me'
import { PageSkeleton } from '@/components/site/page-skeleton'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { queryClient } from '@/lib/query-client'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { usePreferencesStore } from '@/stores/preferences'

export const Route = createFileRoute('/_auth')({
  // pages for an account (library, wishlist, orders, account…): a guest goes
  // to the home page with the login modal open, and comes back once signed in.
  // GET /me answers it (401 = guest), from the cache when it is already there.
  beforeLoad: async ({ location }) => {
    const { currency, language, aiContent } = usePreferencesStore.getState()
    const me = await queryClient.ensureQueryData(
      meQueryOptions({ currency, language, aiContent }),
    )
    if (!me) {
      useAuthDialogStore
        .getState()
        .openAuth('login', { redirectTo: location.href })
      throw redirect({ to: '/' })
    }
  },
  component: AuthLayout,
  // the login check above, on a first visit: the shell with a page outline
  pendingComponent: () => (
    <Shell>
      <PageSkeleton />
    </Shell>
  ),
})

/** Same shell as _site: header, page, footer. */
function AuthLayout() {
  // logged out from one of these pages: nothing here to show any more
  const { data: me } = useMe()
  if (me === null) return <Navigate to="/" replace />

  return (
    <Shell>
      <Outlet />
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}

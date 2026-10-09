import { Outlet, createFileRoute } from '@tanstack/react-router'

import { SiteHeader } from '@/components/site/site-header'

export const Route = createFileRoute('/_focus')({
  component: FocusLayout,
})

function FocusLayout() {
  return (
    <>
      <SiteHeader variant="focus" />
      <main>
        <Outlet />
      </main>
    </>
  )
}

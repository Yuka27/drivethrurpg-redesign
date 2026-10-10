import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AccountSidebarNav } from '@/features/account/account-nav'
import { BalanceCard } from '@/features/account/balance-card'

export const Route = createFileRoute('/_auth/account')({
  component: AccountLayout,
})

/**
 * Desktop: balance and account navigation in a 276px sidebar next to the page.
 * Mobile: no sidebar; /account itself is the "My account" hub with the same links.
 */
function AccountLayout() {
  return (
    <div className="container flex gap-8 pt-6 pb-8 lg:pt-8">
      <aside className="flex w-[276px] shrink-0 flex-col gap-4 max-lg:hidden">
        <BalanceCard variant="sidebar" />
        <AccountSidebarNav />
      </aside>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  )
}

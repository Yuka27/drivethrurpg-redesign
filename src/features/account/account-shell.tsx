import type { ReactNode } from 'react'

import { AccountSidebarNav } from './account-nav'
import { BalanceCard } from './balance-card'

/**
 * The account area's frame. Desktop: balance and account navigation in a 276px
 * sidebar next to the page. Mobile: no sidebar (/account is the "My account"
 * hub with the same links; other pages show a breadcrumb back to it).
 * Used by /account/* and by the activity pages outside it (/following).
 */
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div className="container flex gap-8 pt-6 pb-8 lg:pt-8">
      <aside className="flex w-[276px] shrink-0 flex-col gap-4 max-lg:hidden">
        <BalanceCard variant="sidebar" />
        <AccountSidebarNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

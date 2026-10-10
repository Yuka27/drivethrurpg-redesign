import { Outlet, createFileRoute } from '@tanstack/react-router'

import { AccountShell } from '@/features/account/account-shell'

export const Route = createFileRoute('/_auth/account')({
  component: () => (
    <AccountShell>
      <Outlet />
    </AccountShell>
  ),
})

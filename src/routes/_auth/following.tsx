import { createFileRoute } from '@tanstack/react-router'

import { AccountShell } from '@/features/account/account-shell'
import { FollowingPage } from '@/features/account/following-page'

export const Route = createFileRoute('/_auth/following')({
  component: () => (
    <AccountShell>
      <FollowingPage />
    </AccountShell>
  ),
})

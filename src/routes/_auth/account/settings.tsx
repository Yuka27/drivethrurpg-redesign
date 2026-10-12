import { createFileRoute } from '@tanstack/react-router'

import { AccountSettings } from '@/features/account/account-settings'

export const Route = createFileRoute('/_auth/account/settings')({
  component: () => <AccountSettings breadcrumb />,
})

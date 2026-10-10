import { createFileRoute } from '@tanstack/react-router'

import { AccountPreferencesPage } from '@/features/account/account-preferences'

export const Route = createFileRoute('/_auth/account/preferences')({
  component: () => <AccountPreferencesPage breadcrumb />,
})

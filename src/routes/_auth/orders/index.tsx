import { createFileRoute } from '@tanstack/react-router'

import { AccountShell } from '@/features/account/account-shell'
import { OrdersPage } from '@/features/account/orders-page'

export const Route = createFileRoute('/_auth/orders/')({
  component: () => (
    <AccountShell>
      <OrdersPage />
    </AccountShell>
  ),
})

import { createFileRoute } from '@tanstack/react-router'

import { AccountShell } from '@/features/account/account-shell'
import { OrderDetailPage } from '@/features/account/order-detail-page'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: OrderRoute,
})

function OrderRoute() {
  const { orderId } = Route.useParams()
  return (
    <AccountShell>
      {/* a new order id starts fresh (no leftover state from the previous one) */}
      <OrderDetailPage key={orderId} orderId={orderId} />
    </AccountShell>
  )
}

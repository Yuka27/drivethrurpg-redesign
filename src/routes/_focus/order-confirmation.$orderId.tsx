import { createFileRoute } from '@tanstack/react-router'

import { ConfirmationPage } from '@/features/checkout/confirmation-page'

export const Route = createFileRoute('/_focus/order-confirmation/$orderId')({
  component: ConfirmationRoute,
})

function ConfirmationRoute() {
  const { orderId } = Route.useParams()
  return <ConfirmationPage key={orderId} orderId={orderId} />
}

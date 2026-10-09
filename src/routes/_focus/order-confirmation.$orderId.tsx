import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_focus/order-confirmation/$orderId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/order-confirmation/:orderId"!</div>
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/orders/:orderId"!</div>
}

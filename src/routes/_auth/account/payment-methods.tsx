import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/account/payment-methods')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/account/payment-methods"!</div>
}

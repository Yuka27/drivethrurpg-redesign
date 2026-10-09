import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/account/balance')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/account/balance"!</div>
}

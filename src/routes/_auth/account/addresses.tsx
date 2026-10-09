import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/account/addresses')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/account/addresses"!</div>
}

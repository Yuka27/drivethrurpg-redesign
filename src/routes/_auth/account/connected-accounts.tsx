import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/account/connected-accounts')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/account/connected-accounts"!</div>
}

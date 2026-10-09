import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/account/preferences')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/account/preferences"!</div>
}

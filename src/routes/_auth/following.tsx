import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/following')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/following"!</div>
}

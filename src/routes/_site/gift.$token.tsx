import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_site/gift/$token')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/gift/:token"!</div>
}

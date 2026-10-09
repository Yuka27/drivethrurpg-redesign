import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_site/titles/$titleId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/titles/:titleId"!</div>
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_site/publishers/$publisherId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/publishers/:publisherId"!</div>
}

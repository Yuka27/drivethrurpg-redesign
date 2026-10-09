import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_focus/checkout')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/checkout"!</div>
}

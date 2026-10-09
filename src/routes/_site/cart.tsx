import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_site/cart')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/cart"!</div>
}

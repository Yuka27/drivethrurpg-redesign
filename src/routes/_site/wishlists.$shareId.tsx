import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_site/wishlists/$shareId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/wishlists/:shareId"!</div>
}

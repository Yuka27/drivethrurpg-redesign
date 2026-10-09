import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

// TODO: replace with real session check once auth exists
function isAuthenticated() {
  return true
}

export const Route = createFileRoute('/_auth')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <>
      <header>{/* TODO: site header */}</header>
      <main>
        <Outlet />
      </main>
      <footer>{/* TODO: site footer */}</footer>
    </>
  )
}

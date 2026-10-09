import { Link, Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_auth/account')({
  component: AccountLayout,
})

const accountLinks = [
  { to: '/account', label: 'Profile' },
  { to: '/account/preferences', label: 'Preferences' },
  { to: '/account/addresses', label: 'Addresses' },
  { to: '/account/payment-methods', label: 'Payment methods' },
  { to: '/account/connected-accounts', label: 'Connected accounts' },
  { to: '/account/balance', label: 'Balance' },
] as const

function AccountLayout() {
  return (
    <div className="flex gap-8">
      <nav aria-label="Account">
        <ul>
          {accountLinks.map((link) => (
            <li key={link.to}>
              <Link to={link.to} activeOptions={{ exact: true }}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  )
}

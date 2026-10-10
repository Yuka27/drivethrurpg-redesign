import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { AccountSettings } from './account-settings'
import { getAuthToken, setAuthToken } from '@/lib/auth-token'
import { mockApi, user } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const addresses = [
  {
    id: 'adr_1',
    fullName: 'Arya Stark',
    line1: 'ul. Przykładowa 12/4',
    line2: null,
    city: 'Warszawa',
    region: 'Mazowieckie',
    postalCode: '00-001',
    country: 'PL',
    phone: null,
    isDefault: true,
  },
  {
    id: 'adr_2',
    fullName: 'Arya Stark',
    line1: 'ul. Biurowa 3',
    line2: 'piętro 2',
    city: 'Kraków',
    region: null,
    postalCode: '30-001',
    country: 'PL',
    phone: '+48 600 000 000',
    isDefault: false,
  },
]
const cards = [
  {
    id: 'pm_1',
    brand: 'visa',
    last4: '4242',
    expMonth: 8,
    expYear: 2028,
    isDefault: true,
  },
]

/** The account API with one connected provider (Google), two addresses and a card. */
function mockAccountApi(overrides: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /me': { body: user },
    'GET /account/connected': {
      body: [
        {
          provider: 'google',
          email: user.email,
          connectedAt: '2024-01-05T10:00:00Z',
        },
      ],
    },
    'GET /account/addresses': { body: addresses },
    'GET /account/payment-methods': { body: cards },
    ...overrides,
  })
}

const card = (name: string) => screen.getByRole('region', { name })

describe('AccountSettings', () => {
  it('shows the account details from the API', async () => {
    mockAccountApi()
    await renderWithProviders(<AccountSettings />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Account' }),
    ).toBeVisible()
    // rendered once /me has loaded
    const signIn = await screen.findByRole('region', { name: 'Sign-in' })
    // once beside the button (desktop), once under the hint (mobile); CSS shows one
    expect(within(signIn).getAllByText(user.email)).toHaveLength(2)

    // only Google is linked
    const connected = card('Connected accounts')
    expect(
      await within(connected).findByRole('button', {
        name: 'Disconnect Google',
      }),
    ).toBeVisible()
    expect(
      within(connected).getByRole('button', { name: 'Connect Roll20' }),
    ).toBeVisible()
    expect(
      within(connected).getByRole('button', { name: 'Connect Facebook' }),
    ).toBeVisible()

    // addresses: postcode + city on one line, country name from its code
    const saved = card('Addresses')
    expect(await within(saved).findByText(/00-001 Warszawa/)).toBeVisible()
    expect(within(saved).getAllByText(/Poland/)).toHaveLength(2)
    expect(within(saved).getAllByText('Default')).toHaveLength(1)

    const payments = card('Payment methods')
    expect(
      await within(payments).findByText('Visa ending in 4242'),
    ).toBeVisible()
    expect(within(payments).getByText('Expires 08/2028')).toBeVisible()
  })

  it('shows the empty payment state from the design', async () => {
    mockAccountApi({ 'GET /account/payment-methods': { body: [] } })
    await renderWithProviders(<AccountSettings />)

    const payments = card('Payment methods')
    expect(
      await within(payments).findByText(/No saved payment methods/),
    ).toBeVisible()
    expect(
      within(payments).getByRole('button', { name: 'Add payment method' }),
    ).toBeVisible()
  })

  it('disconnects a provider', async () => {
    let linked = true
    const { bodies } = mockAccountApi({
      'GET /account/connected': () => ({
        body: linked
          ? [{ provider: 'google', email: user.email, connectedAt: '2024' }]
          : [],
      }),
      'DELETE /account/connected/google': () => {
        linked = false
        return { status: 204 }
      },
    })
    const { user: u } = await renderWithProviders(<AccountSettings />)

    await u.click(
      await screen.findByRole('button', { name: 'Disconnect Google' }),
    )

    expect(
      await screen.findByRole('button', { name: 'Connect Google' }),
    ).toBeVisible()
    expect(bodies('DELETE /account/connected/google')).toHaveLength(1)
  })

  it('removes an address only after confirming', async () => {
    const { bodies } = mockAccountApi({
      'DELETE /account/addresses/adr_2': { status: 204 },
    })
    const { user: u } = await renderWithProviders(<AccountSettings />)

    await u.click(
      await screen.findByRole('button', {
        name: 'Remove address: Arya Stark, ul. Biurowa 3',
      }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Remove this address?',
    })
    expect(bodies('DELETE /account/addresses/adr_2')).toHaveLength(0)

    await u.click(within(dialog).getByRole('button', { name: 'Remove' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(bodies('DELETE /account/addresses/adr_2')).toHaveLength(1)
  })

  it('cancelling the confirmation removes nothing', async () => {
    const { fetchMock } = mockAccountApi()
    const { user: u } = await renderWithProviders(<AccountSettings />)

    await u.click(
      await screen.findByRole('button', { name: 'Remove Visa ending in 4242' }),
    )
    await u.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Cancel',
      }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE'),
    ).toHaveLength(0)
  })

  it('changes the email through a confirmation link', async () => {
    const { bodies } = mockAccountApi({
      'POST /account/email/change': { status: 202, body: {} },
    })
    const { user: u } = await renderWithProviders(<AccountSettings />)

    await u.click(await screen.findByRole('button', { name: 'Change email' }))
    const dialog = await screen.findByRole('dialog', { name: 'Change email' })
    const input = within(dialog).getByRole('textbox', {
      name: 'New email address',
    })

    await u.type(input, 'not-an-email')
    await u.click(
      within(dialog).getByRole('button', { name: 'Send confirmation link' }),
    )
    expect(
      await within(dialog).findByText(
        'Enter a valid email address, for example name@example.com.',
      ),
    ).toBeVisible()

    await u.clear(input)
    await u.type(input, 'new@example.com')
    await u.click(
      within(dialog).getByRole('button', { name: 'Send confirmation link' }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(bodies('POST /account/email/change')).toEqual([
      { email: 'new@example.com' },
    ])
  })

  it('changes the password with the current one', async () => {
    const { bodies } = mockAccountApi({
      'POST /account/password': { status: 204 },
    })
    const { user: u } = await renderWithProviders(<AccountSettings />)

    await u.click(
      await screen.findByRole('button', { name: 'Change password' }),
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'Change password',
    })
    await u.click(
      within(dialog).getByRole('button', { name: 'Save new password' }),
    )
    expect(
      await within(dialog).findByText('Enter your password.'),
    ).toBeVisible()
    expect(bodies('POST /account/password')).toHaveLength(0)

    await u.type(within(dialog).getByLabelText('Current password'), 'old-pass')
    await u.type(
      within(dialog).getByLabelText('New password'),
      'a long new passphrase',
    )
    await u.click(
      within(dialog).getByRole('button', { name: 'Save new password' }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(bodies('POST /account/password')).toEqual([
      { currentPassword: 'old-pass', newPassword: 'a long new passphrase' },
    ])
  })

  it('deletes the account after confirming, signs out and goes home', async () => {
    setAuthToken('token_test', { remember: true })
    const { bodies } = mockAccountApi({
      'POST /account/delete': { status: 202, body: {} },
    })
    const { user: u, router } = await renderWithProviders(<AccountSettings />)

    await u.click(await screen.findByRole('button', { name: 'Delete account' }))
    const dialog = await screen.findByRole('dialog', {
      name: 'Delete your account?',
    })
    await u.click(
      within(dialog).getByRole('button', { name: 'Delete my account' }),
    )

    await waitFor(() => expect(getAuthToken()).toBeNull())
    expect(bodies('POST /account/delete')).toHaveLength(1)
    expect(router.history.location.pathname).toBe('/')
  })

  it('says so for flows that are not built yet', async () => {
    const info = vi.spyOn(toast, 'info')
    mockAccountApi()
    const { user: u } = await renderWithProviders(<AccountSettings />)

    await u.click(
      within(card('Library apps')).getByRole('button', { name: 'Manage keys' }),
    )
    expect(info).toHaveBeenCalledWith('This is not available yet.')
  })

  it('shows the mobile breadcrumb back to the hub', async () => {
    mockAccountApi()
    await renderWithProviders(<AccountSettings breadcrumb />)

    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(
      within(crumbs).getByRole('link', { name: 'My account' }),
    ).toHaveAttribute('href', '/account')
    expect(within(crumbs).getByText('Account')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

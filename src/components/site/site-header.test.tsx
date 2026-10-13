import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { SiteHeader } from './site-header'
import type { Me } from '@/api/me'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { useThemeStore } from '@/stores/theme'
import { apiError, mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

afterEach(() => {
  useAuthDialogStore.setState({ open: false, redirectTo: null })
  useThemeStore.getState().setTheme('dark')
})

function mockHeader(me: Handler, overrides: Record<string, Handler> = {}) {
  return mockApi({
    'GET /me': me,
    'GET /titles/facets': {
      body: { formats: [], types: [], ruleSystems: [], publishers: [] },
    },
    'GET /meta/locales': {
      body: {
        currencies: [{ code: 'USD', symbol: '$', label: 'US dollar' }],
        languages: [{ code: 'en', label: 'English', short: 'EN' }],
        defaults: {
          currency: 'USD',
          language: 'en',
          showAiGenerated: false,
          theme: 'dark',
        },
      },
    },
    ...overrides,
  })
}

const withCounts = (counts: Partial<Me['counts']>): Me => ({
  ...user,
  counts: { ...user.counts, ...counts },
})

const renderHeader = () =>
  renderWithProviders(
    <TooltipProvider>
      <SiteHeader />
    </TooltipProvider>,
  )

describe('SiteHeader', () => {
  it('offers a guest the cart and "Log In", which opens the login modal', async () => {
    mockHeader(apiError(401, 'unauthorized'))
    const { user: u } = await renderHeader()

    const login = await screen.findByRole('button', { name: 'Log In' })
    expect(screen.getByRole('link', { name: 'Cart' })).toHaveAttribute(
      'href',
      '/cart',
    )
    expect(screen.queryByRole('link', { name: 'My Library' })).toBeNull()

    await u.click(login)
    expect(useAuthDialogStore.getState()).toMatchObject({
      open: true,
      view: 'login',
    })
  })

  it('gives an account its library, and counts in the names and badges', async () => {
    mockHeader({
      body: withCounts({ cart: 3, wishlist: 1, unreadNotifications: 120 }),
    })
    await renderHeader()

    // to the library view used last (its filters, if any)
    expect(
      (await screen.findByRole('link', { name: 'My Library' })).getAttribute(
        'href',
      ),
    ).toMatch(/^\/library/)
    const cart = screen.getByRole('link', { name: 'Cart, 3 items' })
    expect(within(cart).getByText('3')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Wishlist, 1 item' }),
    ).toBeInTheDocument()
    // a big number is capped in the badge, never in the name
    const bell = screen.getByRole('button', {
      name: 'Notifications, 120 unread',
    })
    expect(within(bell).getByText('99+')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log In' })).toBeNull()
  })

  it('shows no badge for zero', async () => {
    mockHeader({ body: user })
    await renderHeader()

    const cart = await screen.findByRole('link', { name: 'Cart' })
    expect(cart).toHaveTextContent('')
  })

  it('logs out from the account menu, back to the guest header', async () => {
    let loggedIn = true
    const { bodies } = mockHeader(
      () => (loggedIn ? { body: user } : apiError(401, 'unauthorized')),
      {
        'POST /auth/logout': () => {
          loggedIn = false
          return { status: 204 }
        },
      },
    )
    const { user: u } = await renderHeader()

    await u.click(
      await screen.findByRole('button', { name: 'Account menu for Test User' }),
    )
    await u.click(await screen.findByRole('menuitem', { name: 'Log out' }))

    expect(await screen.findByRole('button', { name: 'Log In' })).toBeVisible()
    expect(bodies('POST /auth/logout')).toHaveLength(1)
  })

  it('switches the theme', async () => {
    mockHeader(apiError(401, 'unauthorized'))
    const { user: u } = await renderHeader()

    await u.click(
      await screen.findByRole('button', { name: 'Switch to light theme' }),
    )

    expect(useThemeStore.getState().resolvedTheme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Switch to dark theme' }),
      ).toBeInTheDocument(),
    )
  })
})

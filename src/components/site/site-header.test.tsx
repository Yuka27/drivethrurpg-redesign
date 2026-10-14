import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { SiteHeader } from './site-header'
import type { Me } from '@/api/me'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { usePreferencesStore } from '@/stores/preferences'
import { useThemeStore } from '@/stores/theme'
import { apiError, locales, mockApi, never, user } from '@/test/api'
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
    'GET /meta/locales': { body: locales },
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

  it('offers an account the theme switch too', async () => {
    mockHeader({ body: user }, { 'PATCH /account/preferences': { body: {} } })
    const { user: u } = await renderHeader()

    // the account's header, not the guest one shown while /me loads
    await screen.findByRole('link', { name: 'My Library' })
    await u.click(screen.getByRole('button', { name: 'Switch to light theme' }))

    expect(useThemeStore.getState().resolvedTheme).toBe('light')
  })
})

describe('SiteHeader while /me loads', () => {
  it('outlines an account’s controls, avatar included, for a returning user', async () => {
    localStorage.setItem('dtrpg-session-hint', 'user')
    mockHeader(never)
    await renderHeader()

    expect(await screen.findByTestId('avatar-skeleton')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log In' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'My Library' })).toBeNull()
  })

  it('outlines a guest’s controls when the last visit was a guest', async () => {
    mockHeader(never)
    await renderHeader()

    await screen.findByRole('combobox', { name: 'Search titles' })
    expect(screen.queryByTestId('avatar-skeleton')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Log In' })).toBeNull()
  })

  it('remembers who it was for the next visit', async () => {
    mockHeader({ body: user })
    await renderHeader()

    await screen.findByRole('link', { name: 'My Library' })
    expect(localStorage.getItem('dtrpg-session-hint')).toBe('user')
  })
})

describe('the account menu', () => {
  afterEach(() =>
    usePreferencesStore.setState({ currency: 'USD', aiContent: false }),
  )

  async function openAccountMenu() {
    mockHeader(
      { body: user },
      {
        'GET /meta/locales': {
          body: {
            ...locales,
            currencies: [
              ...locales.currencies,
              { code: 'EUR', symbol: '€', label: 'Euro' },
            ],
          },
        },
      },
    )
    const result = await renderHeader()
    await result.user.click(
      await screen.findByRole('button', { name: 'Account menu for Test User' }),
    )
    return { ...result, menu: await screen.findByRole('menu') }
  }

  it('lists the app, the account pages, quick preferences and log out, in that order', async () => {
    const { menu } = await openAccountMenu()

    expect(
      // every kind of item: menuitem, menuitemcheckbox
      [...menu.querySelectorAll('[role^=menuitem]')].map(
        (item) => item.getAttribute('aria-label') ?? item.textContent,
      ),
    ).toEqual([
      'Get the app',
      'Account settings',
      'Preferences',
      'Orders',
      'Following',
      'Currency: USD',
      'Language: EN',
      'AI content',
      'Log out',
    ])
    expect(within(menu).getByText('Quick preferences')).toBeVisible()
  })

  it('picks a currency from its list beside the menu', async () => {
    const { user: u, menu } = await openAccountMenu()

    // a submenu: → opens it, ↓ moves, Enter picks
    act(() =>
      within(menu).getByRole('menuitem', { name: 'Currency: USD' }).focus(),
    )
    await u.keyboard('{ArrowRight}')
    await screen.findByRole('menuitemradio', { name: /EUR/ })
    await u.keyboard('{ArrowDown}{Enter}')

    expect(usePreferencesStore.getState().currency).toBe('EUR')
  })

  it('switches AI content on the spot, keeping the menu open', async () => {
    const { user: u, menu } = await openAccountMenu()
    const ai = within(menu).getByRole('menuitemcheckbox', {
      name: 'AI content',
    })
    expect(ai).toHaveAttribute('aria-checked', 'false')

    await u.click(ai)

    expect(usePreferencesStore.getState().aiContent).toBe(true)
    expect(screen.getByRole('menu')).toBeVisible()
    expect(ai).toHaveAttribute('aria-checked', 'true')
  })
})

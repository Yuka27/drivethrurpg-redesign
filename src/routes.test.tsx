// The routes themselves (src/routes/): which page a URL opens, the login
// check, the 404 and error pages, and how filters live in the URL. The real
// route tree, layouts, header and footer, with every request faked.
import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { useAuthDialogStore } from '@/stores/auth-dialog'
import { useRecentSearches } from '@/stores/recent-searches'
import { apiError, user } from '@/test/api'
import { mockApp, renderApp } from '@/test/app'
import { vaesen } from '@/test/title'

afterEach(() => {
  useAuthDialogStore.setState({ open: false, redirectTo: null })
})

const guest = apiError(401, 'unauthorized')
type AppRouter = Awaited<ReturnType<typeof renderApp>>['router']
const leafRoute = (router: AppRouter) => router.state.matches.at(-1)?.routeId

describe('each URL opens its page', () => {
  it.each([
    ['/', '/_site/'],
    ['/titles', '/_site/titles/'],
    ['/cart', '/_site/cart'],
    ['/library', '/_auth/library'],
    ['/wishlist', '/_auth/wishlist'],
    ['/orders', '/_auth/orders/'],
    ['/following', '/_auth/following'],
    ['/account', '/_auth/account/'],
    ['/account/settings', '/_auth/account/settings'],
    ['/account/preferences', '/_auth/account/preferences'],
    ['/checkout', '/_focus/checkout'],
  ])('%s', async (url, routeId) => {
    mockApp()
    const { router } = await renderApp(url)

    expect(leafRoute(router)).toBe(routeId)
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.queryByText('Critical miss')).toBeNull()
    expect(screen.queryByText('Something went wrong')).toBeNull()
  })

  it('hands the title id to the product page', async () => {
    mockApp({ 'GET /titles/ttl_vaesen': { body: vaesen } })
    await renderApp('/titles/ttl_vaesen')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Vaesen: City of My Nightmares',
      }),
    ).toBeVisible()
  })

  it('hands the words to the search page', async () => {
    mockApp({
      'GET /search': {
        body: { items: [], total: 0, page: 1, pageSize: 20, didYouMean: null },
      },
    })
    await renderApp('/search?q=dragons')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Results for “dragons”' }),
    ).toBeVisible()
  })

  it.each([
    ['/orders/DT-48612903', 'GET /orders/DT-48612903'],
    ['/order-confirmation/DT-48612903', 'GET /orders/DT-48612903'],
    ['/gift/tok_ready', 'GET /gifts/tok_ready'],
  ])('hands the id in %s to its page', async (url, request) => {
    const { params } = mockApp()
    await renderApp(url)

    await waitFor(() => expect(params(request)).toHaveLength(1))
  })
})

describe('the 404 page', () => {
  it('answers an unknown URL with the way home and the usual places', async () => {
    mockApp()
    await renderApp('/no-such-page')

    expect(
      screen.getByRole('heading', { level: 1, name: 'Critical miss' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Go to the homepage' }),
    ).toHaveAttribute('href', '/')
    expect(
      screen.getByRole('link', { name: 'Deal of the Day' }),
    ).toHaveAttribute('href', '/titles?onSale=true')
    // inside the site's header and footer
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})

describe('the error page', () => {
  it('shows when a page cannot get ready, and tries again', async () => {
    let up = false
    mockApp({}, () => (up ? { body: user } : apiError(500, 'server_error')))
    const { router, user: u } = await renderApp('/library')

    expect(
      screen.getByRole('heading', { name: 'Something went wrong' }),
    ).toBeVisible()

    up = true
    await u.click(screen.getByRole('button', { name: 'Try again' }))

    await waitFor(() => expect(leafRoute(router)).toBe('/_auth/library'))
    await waitFor(() =>
      expect(screen.queryByText('Something went wrong')).toBeNull(),
    )
  })
})

describe('pages that need an account', () => {
  it('send a guest home with the login modal, to come back once signed in', async () => {
    mockApp({}, guest)
    const { router } = await renderApp('/library?status=updated')

    expect(router.state.location.pathname).toBe('/')
    expect(useAuthDialogStore.getState()).toMatchObject({
      open: true,
      view: 'login',
      redirectTo: '/library?status=updated',
    })
  })

  it('open for an account', async () => {
    mockApp()
    const { router } = await renderApp('/wishlist')

    expect(router.state.location.pathname).toBe('/wishlist')
    expect(useAuthDialogStore.getState().open).toBe(false)
  })

  it('show the page’s outline while the login is checked', async () => {
    mockApp({}, () => new Promise(() => {}))
    await renderApp('/library', { wait: false })

    // after the router's pending delay
    expect(
      await screen.findByText('Loading…', {}, { timeout: 3000 }),
    ).toHaveAttribute('role', 'status')
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })

  it('leave for the home page when the user logs out there', async () => {
    let loggedIn = true
    mockApp(
      {
        'POST /auth/logout': () => {
          loggedIn = false
          return { status: 204 }
        },
      },
      () => (loggedIn ? { body: user } : guest),
    )
    const { router, user: u } = await renderApp('/library')

    await u.click(
      await screen.findByRole('button', { name: 'Account menu for Test User' }),
    )
    await u.click(await screen.findByRole('menuitem', { name: 'Log out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  })
})

describe('filters in the URL', () => {
  it('keep defaults out of the address', async () => {
    mockApp()
    const { router } = await renderApp('/wishlist?sort=added&page=1')

    await waitFor(() => expect(router.state.location.searchStr).toBe(''))
  })

  it('keep the commas of a multi-select readable', async () => {
    mockApp()
    const { router } = await renderApp('/titles?system=osr%2Cd20_5e')

    await waitFor(() =>
      expect(router.state.location.searchStr).toBe('?system=osr,d20_5e'),
    )
  })

  it('replace the history entry for a filter, and add one for a page', async () => {
    mockApp({
      'GET /titles': ({ params }) => ({
        body: {
          items: [vaesen],
          total: 45,
          page: Number(params.get('page') ?? 1),
          pageSize: 20,
        },
      }),
      'GET /home': { body: { hero: [], sections: [] } },
    })
    const { router, user: u } = await renderApp('/titles')
    const entries = () => router.history.length

    const start = entries()
    await u.click(await screen.findByRole('button', { name: 'Free' }))
    await waitFor(() =>
      expect(router.state.location.searchStr).toBe('?priceMax=0'),
    )
    expect(entries()).toBe(start)

    await u.click(await screen.findByRole('button', { name: 'Page 2' }))
    await waitFor(() =>
      expect(router.state.location.searchStr).toBe('?priceMax=0&page=2'),
    )
    expect(entries()).toBe(start + 1)

    router.history.back()
    await waitFor(() =>
      expect(router.state.location.searchStr).toBe('?priceMax=0'),
    )
  })
})

describe('the checkout layout', () => {
  it('keeps the header to the logo, "Secure checkout" and the way back', async () => {
    mockApp()
    await renderApp('/checkout')

    const header = screen.getByRole('banner')
    expect(within(header).getByText('Secure checkout')).toBeInTheDocument()
    expect(
      within(header).getByRole('link', { name: 'Back to cart' }),
    ).toHaveAttribute('href', '/cart')
    // nothing to wander off to while paying
    expect(screen.queryByRole('combobox', { name: 'Search titles' })).toBeNull()
    expect(screen.queryByRole('contentinfo')).toBeNull()
  })

  it('offers "Continue shopping" once the order is placed', async () => {
    mockApp()
    await renderApp('/order-confirmation/DT-48612903')

    expect(
      within(screen.getByRole('banner')).getByRole('link', {
        name: 'Continue shopping',
      }),
    ).toHaveAttribute('href', '/')
    expect(screen.queryByText('Secure checkout')).toBeNull()
  })
})

describe('a new id starts its page fresh', () => {
  it('opens another title without the previous one’s chosen edition', async () => {
    mockApp({
      'GET /titles/ttl_vaesen': { body: vaesen },
      'GET /titles/ttl_coriolis': {
        body: { ...vaesen, id: 'ttl_coriolis', title: 'Coriolis' },
      },
    })
    const { router, user: u } = await renderApp('/titles/ttl_vaesen')
    const edition = (name: RegExp) =>
      within(screen.getByRole('radiogroup', { name: 'Edition' })).getByRole(
        'radio',
        { name },
      )

    await screen.findByRole('heading', {
      level: 1,
      name: 'Vaesen: City of My Nightmares',
    })
    await u.click(edition(/^Hardcover/))
    expect(edition(/^Hardcover/)).toBeChecked()

    await act(() =>
      router.navigate({
        to: '/titles/$titleId',
        params: { titleId: 'ttl_coriolis' },
      }),
    )

    await screen.findByRole('heading', { level: 1, name: 'Coriolis' })
    expect(edition(/^PDF/)).toBeChecked()
  })
})

describe('the search page', () => {
  it('starts a suggested search afresh, and remembers it', async () => {
    mockApp({
      'GET /search': ({ params }) => ({
        body: {
          items: params.get('q') === 'dragon' ? [vaesen] : [],
          total: params.get('q') === 'dragon' ? 1 : 0,
          page: 1,
          pageSize: 20,
          didYouMean: 'dragon',
        },
      }),
    })
    const { router, user: u } = await renderApp('/search?q=dragn&sort=newest')
    const start = router.history.length

    await u.click(await screen.findByRole('button', { name: 'dragon' }))

    await waitFor(() =>
      expect(router.state.location.searchStr).toBe('?q=dragon'),
    )
    // a new search is a new history entry: Back returns to the old words
    expect(router.history.length).toBe(start + 1)
    expect(useRecentSearches.getState().queries[0]).toBe('dragon')
  })
})

describe('the orders list', () => {
  const summary = {
    id: 'ord_DT-48213907',
    number: 'DT-48213907',
    placedAt: '2026-05-06T10:00:00Z',
    status: 'paid',
    total: { amount: 2698, currency: 'USD' },
    itemCount: 1,
  }

  it('keeps its filters out of history, and the order page returns to them', async () => {
    mockApp({ 'GET /orders': { body: { items: [summary] } } })
    const { router, user: u } = await renderApp('/orders?q=DT-4821')
    const start = router.history.length

    await u.type(
      await screen.findByRole('searchbox', { name: 'Search orders by number' }),
      '3',
    )
    await waitFor(() =>
      expect(router.state.location.searchStr).toBe('?q=DT-48213'),
    )
    expect(router.history.length).toBe(start)

    await act(() =>
      router.navigate({
        to: '/orders/$orderId',
        params: { orderId: 'DT-48213907' },
      }),
    )
    // the page's "← Orders" and the account sidebar's link alike
    await screen.findAllByRole('link', { name: 'Orders' })
    for (const link of screen.getAllByRole('link', { name: 'Orders' }))
      expect(link).toHaveAttribute('href', '/orders?q=DT-48213')
  })
})

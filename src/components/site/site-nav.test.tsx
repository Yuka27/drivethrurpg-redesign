import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { MobileMenu } from './mobile-menu'
import { SiteNav } from './site-nav'
import { apiError, facet, mockApi, user } from '@/test/api'
import { renderWithProviders } from '@/test/render'

function mockFacets(
  genres: Array<ReturnType<typeof facet>> = [],
  extra: Parameters<typeof mockApi>[0] = {},
) {
  return mockApi({
    'GET /me': { body: user },
    ...extra,
    'GET /titles/facets': {
      body: {
        genres,
        formats: [facet('pdf', 'pdf', 20)],
        types: [facet('adventure', 'adventure', 8)],
        ruleSystems: [facet('d20_5e', 'd20 5e', 5)],
        publishers: [facet('pub_free_league', 'Free League Publishing', 5)],
      },
    },
  })
}

describe('SiteNav', () => {
  it('opens a menu of values, each linking to the filtered listing', async () => {
    mockFacets([facet('horror', 'Horror', 7)])
    const { user: u } = await renderWithProviders(<SiteNav />)

    const nav = await screen.findByRole('navigation', {
      name: 'Browse the catalog',
    })
    await within(nav).findByRole('button', { name: 'Publisher' })
    expect(
      within(nav)
        .getAllByRole('button')
        .map((button) => button.textContent.trim()),
    ).toEqual(['Publisher', 'Genre', 'Product Type', 'Rule System', 'Format'])

    await u.click(within(nav).getByRole('button', { name: 'Genre' }))
    expect(within(nav).getByRole('link', { name: /Horror/ })).toHaveAttribute(
      'href',
      '/titles?genre=horror',
    )
  })

  it('opens a publisher menu by keyboard, with a way to the whole catalogue', async () => {
    mockFacets()
    const { user: u } = await renderWithProviders(<SiteNav />)

    const nav = await screen.findByRole('navigation', {
      name: 'Browse the catalog',
    })
    ;(await within(nav).findByRole('button', { name: 'Publisher' })).focus()
    await u.keyboard('{Enter}')

    expect(
      await within(nav).findByRole('link', { name: /Free League Publishing/ }),
    ).toHaveAttribute('href', '/titles?publisher=pub_free_league')
    expect(
      within(nav).getByRole('link', { name: 'Browse all titles' }),
    ).toHaveAttribute('href', '/titles')
  })

  it('leaves Genre out while the API has no genres', async () => {
    mockFacets()
    await renderWithProviders(<SiteNav />)

    const nav = await screen.findByRole('navigation', {
      name: 'Browse the catalog',
    })
    await within(nav).findByRole('button', { name: 'Publisher' })
    expect(within(nav).queryByRole('button', { name: 'Genre' })).toBeNull()
  })
})

describe('MobileMenu', () => {
  it('browses by facet and closes when a link is followed', async () => {
    mockFacets([facet('horror', 'Horror', 7)])
    const { user: u } = await renderWithProviders(<MobileMenu />)

    await u.click(screen.getByRole('button', { name: 'Open menu' }))
    const browse = await screen.findByRole('navigation', {
      name: 'Browse the catalog',
    })
    await u.click(within(browse).getByRole('button', { name: 'Rule System' }))
    const link = within(browse).getByRole('link', { name: /D20 \/ 5e/ })
    expect(link).toHaveAttribute('href', '/titles?system=d20_5e')

    await u.click(link)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('gives a signed-in user the library, the account pages and a quiet "Log out"', async () => {
    const { bodies } = mockFacets([], { 'POST /auth/logout': { status: 204 } })
    const { user: u } = await renderWithProviders(<MobileMenu />)

    await u.click(screen.getByRole('button', { name: 'Open menu' }))
    const menu = await screen.findByRole('dialog', { name: 'Menu' })

    // the library as the user left it, its filters remembered
    expect(
      await within(menu).findByRole('link', { name: 'My library' }),
    ).toHaveAttribute('href', expect.stringMatching(/^\/library(\?|$)/))
    // the library apps, for someone with a library
    expect(
      within(menu).getByRole('link', { name: 'Get the app' }),
    ).toBeVisible()
    const settings = within(menu).getByRole('navigation', { name: 'Settings' })
    expect(
      within(settings)
        .getAllByRole('link')
        // the path: Orders keeps the list's remembered filters
        .map((link) => [
          link.textContent,
          link.getAttribute('href')?.split('?')[0],
        ]),
    ).toEqual([
      ['Account', '/account/settings'],
      ['Preferences', '/account/preferences'],
      ['Orders', '/orders'],
      ['Following', '/following'],
    ])
    expect(
      within(menu).getByRole('heading', { name: 'Quick preferences' }),
    ).toBeVisible()
    // no avatar card: neither the name nor the email
    expect(within(menu).queryByText(user.displayName)).toBeNull()
    expect(within(menu).queryByText(user.email)).toBeNull()

    await u.click(within(menu).getByRole('button', { name: 'Log out' }))
    await waitFor(() => expect(bodies('POST /auth/logout')).toHaveLength(1))
  })

  it('keeps the account pages from a guest', async () => {
    mockApi({
      'GET /me': apiError(401, 'unauthorized'),
      'GET /titles/facets': {
        body: {
          genres: [],
          formats: [],
          types: [],
          ruleSystems: [],
          publishers: [],
        },
      },
    })
    const { user: u } = await renderWithProviders(<MobileMenu />)

    await u.click(screen.getByRole('button', { name: 'Open menu' }))
    const menu = await screen.findByRole('dialog', { name: 'Menu' })

    expect(
      await within(menu).findByRole('button', { name: 'Log in' }),
    ).toBeVisible()
    expect(within(menu).queryByRole('link', { name: 'My library' })).toBeNull()
    expect(within(menu).queryByRole('link', { name: 'Get the app' })).toBeNull()
    expect(
      within(menu).queryByRole('navigation', { name: 'Settings' }),
    ).toBeNull()
    expect(within(menu).getByRole('link', { name: 'Wishlist' })).toBeVisible()
  })
})

import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { MobileMenu } from './mobile-menu'
import { SiteNav } from './site-nav'
import { mockApi, user } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const facet = (value: string, label: string, count: number) => ({
  value,
  label,
  count,
})

function mockFacets(genres: Array<ReturnType<typeof facet>> = []) {
  return mockApi({
    'GET /me': { body: user },
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

    // keyboard: Escape closes, Enter opens another (a click would follow a
    // hover that already opened it, and toggle it shut)
    await u.keyboard('{Escape}')
    within(nav).getByRole('button', { name: 'Publisher' }).focus()
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
})

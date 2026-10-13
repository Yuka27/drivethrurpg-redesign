import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

import { ListingPage } from './listing-page'
import { LISTING_SEARCH_DEFAULTS } from './listing-search'
import type { TitleSummary } from '@/api/titles'
import { mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const usd = (amount: number) => ({ amount, currency: 'USD' })
const vaesen: TitleSummary = {
  id: 'ttl_vaesen',
  title: 'Vaesen: Mythic Carpathia',
  publisher: { id: 'pub_free_league', name: 'Free League Publishing' },
  cover: null,
  type: 'setting',
  ruleSystem: 'year_zero',
  formats: ['pdf'],
  price: usd(1999),
  listPrice: usd(1999),
  onSale: false,
  rating: null,
  owned: false,
  inWishlist: false,
  textLanguage: 'en',
}

const facets = {
  formats: [],
  types: [],
  ruleSystems: [{ value: 'year_zero', label: 'year zero', count: 1 }],
  publishers: [],
}

function mockResults(search: Handler, overrides: Record<string, Handler> = {}) {
  return mockApi({
    'GET /me': { body: user },
    'GET /search': search,
    'GET /titles/facets': { body: facets },
    'GET /search/suggest': {
      body: { titles: [], publishers: [], queries: [] },
    },
    'GET /search/popular': { body: { terms: ['Coriolis'] } },
    'GET /meta/locales': { body: { currencies: [], languages: [] } },
    ...overrides,
  })
}

const renderResults = (q: string, onSearch = vi.fn()) =>
  renderWithProviders(
    <ListingPage
      mode="search"
      search={{ ...LISTING_SEARCH_DEFAULTS, q }}
      onSearchChange={() => {}}
      onSearch={onSearch}
    />,
  )

describe('ListingPage in search mode', () => {
  it('lists what matches the words, from GET /search', async () => {
    const { params } = mockResults({
      body: { items: [vaesen], total: 1, page: 1, pageSize: 20 },
    })
    await renderResults('vaesen')

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Results for “vaesen”',
      }),
    ).toBeVisible()
    expect(await screen.findByText('1 title')).toBeVisible()
    const results = screen.getAllByRole('list', {
      name: 'Results for “vaesen”',
    })[0]
    expect(
      within(results).getByRole('link', { name: 'Vaesen: Mythic Carpathia' }),
    ).toBeVisible()
    expect(params('GET /search')[0].get('q')).toBe('vaesen')
    // the facets count within the search too
    await waitFor(() =>
      expect(params('GET /titles/facets')[0].get('q')).toBe('vaesen'),
    )
  })

  it('offers the spelling fix and popular searches when nothing matches', async () => {
    mockResults({
      body: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
        didYouMean: 'Vaesen',
      },
    })
    const onSearch = vi.fn()
    const { user: u } = await renderResults('vaesn', onSearch)

    expect(
      await screen.findByRole('heading', { name: 'No results for “vaesn”' }),
    ).toBeVisible()
    await u.click(screen.getByRole('button', { name: 'Vaesen' }))
    expect(onSearch).toHaveBeenCalledWith('Vaesen')

    await u.click(await screen.findByRole('button', { name: 'Coriolis' }))
    expect(onSearch).toHaveBeenLastCalledWith('Coriolis')
    expect(
      screen.getByRole('link', { name: 'Browse all titles' }),
    ).toHaveAttribute('href', '/titles')
  })
})

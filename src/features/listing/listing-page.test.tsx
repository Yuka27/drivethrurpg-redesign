import { screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { ListingPage } from './listing-page'
import { LISTING_SEARCH_DEFAULTS } from './listing-search'
import type { ListingSearch } from './listing-search'
import type { TitleCard } from '@/api/titles'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { apiError, mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const usd = (amount: number) => ({ amount, currency: 'USD' })
function title(id: string, overrides: Partial<TitleCard> = {}): TitleCard {
  return {
    id,
    title: `Title ${id}`,
    publisher: { id: 'pub_red_door', name: 'Red Door Games' },
    cover: { url: `/img/${id}.jpg`, alt: '' },
    type: 'adventure',
    ruleSystem: 'osr',
    formats: ['pdf'],
    price: usd(1999),
    listPrice: usd(1999),
    onSale: false,
    rating: { average: 4.3, count: 120 },
    owned: false,
    inWishlist: false,
    textLanguage: 'en',
    ...overrides,
  }
}

const catalogue = [
  title('ttl_vaesen', {
    title: 'Vaesen: Mythic Carpathia',
    publisher: { id: 'pub_free_league', name: 'Free League Publishing' },
    ruleSystem: 'year_zero',
    type: 'setting',
  }),
  title('ttl_ashes', { title: 'Ashes of the Hollow King', price: usd(1499) }),
  title('ttl_gloam', {
    title: 'Gloamwood',
    ruleSystem: 'd20_5e',
    price: usd(1099),
    listPrice: usd(1399),
    onSale: true,
  }),
  title('ttl_zine', {
    title: 'Quillfeather Quickstart',
    price: usd(0),
    owned: true,
  }),
]

const facet = (value: string, label: string, count: number) => ({
  value,
  label,
  count,
})

/** A small fake of GET /titles: filters on system and priceMax, like the API. */
function titlesHandler(items: Array<TitleCard>): Handler {
  return ({ params }) => {
    const systems = params.get('system')?.split(',')
    const max = params.get('priceMax')
    const matching = items.filter(
      (item) =>
        (!systems || systems.includes(item.ruleSystem ?? '')) &&
        (max === null || item.price.amount <= Number(max)),
    )
    return {
      body: {
        items: matching,
        total: matching.length,
        page: Number(params.get('page') ?? 1),
        pageSize: Number(params.get('pageSize') ?? 20),
      },
    }
  }
}

function mockListing(
  overrides: Record<string, Handler> = {},
  me: Handler = { body: user },
) {
  return mockApi({
    'GET /me': me,
    'GET /titles': titlesHandler(catalogue),
    'GET /titles/facets': ({ params }) => ({
      body: {
        formats: [facet('pdf', 'pdf', 4)],
        types: [
          facet('adventure', 'adventure', 3),
          facet('setting', 'setting', 1),
        ],
        // like the API: counted under the filters sent
        ruleSystems: params.get('system')
          ? [facet('osr', 'osr', 2)]
          : [
              facet('osr', 'osr', 2),
              facet('year_zero', 'year zero', 1),
              facet('d20_5e', 'd20 5e', 1),
            ],
        publishers: [facet('pub_red_door', 'Red Door Games', 3)],
      },
    }),
    'GET /meta/locales': {
      body: {
        currencies: [{ code: 'USD', symbol: '$', label: 'US dollar' }],
        languages: [
          { code: 'en', label: 'English', short: 'EN' },
          { code: 'pl', label: 'Polski', short: 'PL' },
        ],
        defaults: {
          currency: 'USD',
          language: 'en',
          showAiGenerated: false,
          theme: 'dark',
        },
      },
    },
    'GET /home': { body: { hero: [], sections: [] } },
    ...overrides,
  })
}

function Harness({ initial }: { initial: ListingSearch }) {
  const [search, setSearch] = useState(initial)
  return (
    <>
      <ListingPage
        search={search}
        onSearchChange={(patch) =>
          setSearch((previous) => ({ ...previous, ...patch }))
        }
      />
      <output data-testid="search">{JSON.stringify(search)}</output>
    </>
  )
}
const currentSearch = (): ListingSearch =>
  JSON.parse(screen.getByTestId('search').textContent)

async function renderListing(initial: Partial<ListingSearch> = {}) {
  const result = await renderWithProviders(
    <Harness initial={{ ...LISTING_SEARCH_DEFAULTS, ...initial }} />,
  )
  await waitFor(() =>
    expect(
      screen.getByRole('list', { name: 'All titles' }),
    ).not.toHaveAttribute('aria-busy'),
  )
  return result
}

const titlesShown = () =>
  within(screen.getByRole('list', { name: 'All titles' }))
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent)
const sidebar = () => screen.getByRole('complementary', { name: 'Filters' })
const lastParams = (
  params: (key: string) => Array<URLSearchParams>,
  key: string,
) => params(key).at(-1)

describe('ListingPage', () => {
  it('shows a page of titles as cards', async () => {
    const { params } = mockListing()
    await renderListing()

    expect(titlesShown()).toEqual([
      'Vaesen: Mythic Carpathia',
      'Ashes of the Hollow King',
      'Gloamwood',
      'Quillfeather Quickstart',
    ])
    expect(screen.getByText('Showing 1–4 of 4')).toBeInTheDocument()
    // "Best Match" sends no sort; 20 a page
    expect(lastParams(params, 'GET /titles')?.get('sort')).toBeNull()
    expect(lastParams(params, 'GET /titles')?.get('pageSize')).toBe('20')
    // on sale: the old price struck through; free and owned titles say so
    expect(screen.getByText('$13.99').closest('s')).not.toBeNull()
    expect(
      screen.getByRole('link', {
        name: 'In your library: Quillfeather Quickstart',
      }),
    ).toHaveAttribute('href', '/library')
  })

  it('filters through the API, keeping the counts of the facet in use', async () => {
    const { params } = mockListing()
    const { user: u } = await renderListing()

    await u.click(within(sidebar()).getByLabelText('OSR'))

    expect(currentSearch()).toMatchObject({ system: 'osr', page: 1 })
    await waitFor(() =>
      expect(titlesShown()).toEqual([
        'Ashes of the Hollow King',
        'Quillfeather Quickstart',
      ]),
    )
    expect(lastParams(params, 'GET /titles')?.get('system')).toBe('osr')
    // its siblings still listed with counts: counted without the facet's own picks
    expect(
      within(sidebar()).getByLabelText('Year Zero Engine'),
    ).toBeInTheDocument()
    expect(
      params('GET /titles/facets').some((p) => p.get('system') === null),
    ).toBe(true)

    await u.click(within(sidebar()).getByLabelText('D20 / 5e'))
    expect(currentSearch().system).toBe('osr,d20_5e')
  })

  it('shows what is applied as chips that remove it', async () => {
    mockListing()
    const { user: u } = await renderListing({
      system: 'osr,year_zero',
      priceMax: 10,
    })

    const chips = screen.getByRole('group', { name: 'Applied filters' })
    expect(
      within(chips).getByRole('button', {
        name: 'Remove filter: Rule System: OSR',
      }),
    ).toBeVisible()
    // phones show one chip, then "+ N more"
    expect(
      within(chips).getByRole('button', { name: '+ 2 more' }),
    ).toBeVisible()

    await u.click(
      within(chips).getByRole('button', {
        name: 'Remove filter: Rule System: OSR',
      }),
    )
    expect(currentSearch().system).toBe('year_zero')

    await u.click(within(chips).getByRole('button', { name: 'Clear all' }))
    expect(currentSearch()).toMatchObject({ system: '', page: 1 })
    expect(currentSearch().priceMax).toBeUndefined()
  })

  it('filters by price, in the API’s minor units', async () => {
    const { params } = mockListing()
    const { user: u } = await renderListing()

    await u.click(within(sidebar()).getByLabelText('Under $20'))
    await waitFor(() =>
      expect(lastParams(params, 'GET /titles')?.get('priceMax')).toBe('2000'),
    )

    await u.type(within(sidebar()).getByLabelText('Highest price'), '12.50')
    await u.click(within(sidebar()).getByRole('button', { name: 'Go' }))
    expect(currentSearch().priceMax).toBe(12.5)
    await waitFor(() =>
      expect(titlesShown()).toEqual(['Gloamwood', 'Quillfeather Quickstart']),
    )
    expect(within(sidebar()).getByLabelText('Up to $12.50')).toBeChecked()
  })

  it('toggles quick filters', async () => {
    mockListing()
    const { user: u } = await renderListing()
    const quick = screen.getByRole('group', { name: 'Quick filters' })

    await u.click(within(quick).getByRole('button', { name: 'Free' }))
    expect(currentSearch().priceMax).toBe(0)
    expect(within(quick).getByRole('button', { name: 'Free' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await u.click(
      within(quick).getByRole('button', { name: 'Year Zero Engine' }),
    )
    expect(currentSearch().system).toBe('year_zero')
  })

  it('sorts, and switches to the list view', async () => {
    const { params } = mockListing()
    const { user: u } = await renderListing()

    await u.click(screen.getByRole('radio', { name: 'List' }))
    expect(currentSearch().view).toBe('list')
    expect(
      screen.getByRole('button', { name: 'Add to Cart: Gloamwood' }),
    ).toHaveTextContent('Add to Cart')

    await u.click(screen.getByRole('combobox', { name: 'Sort' }))
    await u.click(await screen.findByRole('option', { name: 'Newest' }))
    await waitFor(() =>
      expect(lastParams(params, 'GET /titles')?.get('sort')).toBe('newest'),
    )
  })

  it('adds a title to the cart with its first edition', async () => {
    const success = vi.spyOn(toast, 'success')
    const { bodies } = mockListing({
      'GET /titles/ttl_ashes': {
        body: {
          editions: [{ sku: 'sku_ashes_pdf' }, { sku: 'sku_ashes_print' }],
        },
      },
      'POST /cart/items': { status: 201, body: {} },
    })
    const { user: u } = await renderListing()

    await u.click(
      screen.getByRole('button', {
        name: 'Add to Cart: Ashes of the Hollow King',
      }),
    )

    await waitFor(() =>
      expect(bodies('POST /cart/items')).toEqual([
        { sku: 'sku_ashes_pdf', qty: 1 },
      ]),
    )
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        'Ashes of the Hollow King is in your cart.',
        expect.anything(),
      ),
    )
  })

  it('says so when the cart cannot take it', async () => {
    const error = vi.spyOn(toast, 'error')
    mockListing({
      'GET /titles/ttl_ashes': {
        body: { editions: [{ sku: 'sku_ashes_pdf' }] },
      },
      'POST /cart/items': apiError(503, 'unavailable'),
    })
    const { user: u } = await renderListing()

    await u.click(
      screen.getByRole('button', {
        name: 'Add to Cart: Ashes of the Hollow King',
      }),
    )
    await waitFor(() => expect(error).toHaveBeenCalled())
  })

  it('adds to the wishlist at once, for a logged-in user', async () => {
    const { bodies } = mockListing({
      'POST /wishlist/items': { status: 201, body: {} },
    })
    const { user: u } = await renderListing()

    const heart = screen.getByRole('button', { name: 'Wishlist: Gloamwood' })
    await u.click(heart)

    expect(heart).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() =>
      expect(bodies('POST /wishlist/items')).toEqual([
        { titleId: 'ttl_gloam' },
      ]),
    )
  })

  it('asks a guest to log in before wishlisting', async () => {
    const { fetchMock } = mockListing({}, apiError(401, 'unauthorized'))
    const { user: u } = await renderListing()

    await u.click(screen.getByRole('button', { name: 'Wishlist: Gloamwood' }))

    expect(useAuthDialogStore.getState()).toMatchObject({
      open: true,
      view: 'login',
    })
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'POST'),
    ).toBe(false)
    useAuthDialogStore.getState().setOpen(false)
  })

  it('offers to clear filters when nothing matches', async () => {
    mockListing()
    const { user: u } = await renderWithProviders(
      <Harness
        initial={{ ...LISTING_SEARCH_DEFAULTS, system: 'pathfinder' }}
      />,
    )

    expect(
      await screen.findByText('No titles match these filters.'),
    ).toBeVisible()
    await u.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(currentSearch().system).toBe('')
  })

  it('opens the filters in a sheet on phones', async () => {
    mockListing()
    const { user: u } = await renderListing({ system: 'osr' })

    await u.click(screen.getByRole('button', { name: /^Filters/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })
    expect(
      within(sheet).getByRole('button', { name: /^Rule System/ }),
    ).toHaveTextContent('1 selected')

    await u.click(within(sheet).getByRole('button', { name: 'Show 2 results' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

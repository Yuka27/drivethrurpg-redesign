import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { HomePage } from './home-page'
import type { TitleCard } from '@/api/titles'
import { useRecentlyViewed } from '@/stores/recently-viewed'
import { mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

afterEach(() => useRecentlyViewed.setState({ titles: [] }))

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

const facet = (value: string, label: string, count: number) => ({
  value,
  label,
  count,
})

function mockHome(overrides: Record<string, Handler> = {}) {
  return mockApi({
    'GET /me': { body: user },
    'GET /home': {
      body: {
        hero: [
          {
            id: 'bn_1',
            title: 'Autumn of Horror sale',
            subtitle: 'Up to 30% off',
            cta: 'Shop the sale',
            link: '/titles?onSale=true',
            image: { url: '/img/hero.jpg', alt: '' },
          },
        ],
        sections: [
          {
            id: 'sale',
            title: 'On sale',
            titles: [
              title('ttl_imperium', {
                title: 'Imperium Maledictum',
                onSale: true,
                listPrice: usd(2499),
              }),
            ],
          },
          {
            id: 'new',
            title: 'New releases',
            titles: [
              title('ttl_bells', { title: 'Drowned Bells' }),
              title('ttl_gloam', { title: 'Gloamwood' }),
            ],
          },
          {
            id: 'bestselling',
            title: 'Bestselling',
            titles: [title('ttl_eberron', { title: 'Exploring Eberron' })],
          },
          // no titles: no tab
          { id: 'free', title: 'Free', titles: [] },
        ],
      },
    },
    'GET /titles/facets': {
      body: {
        formats: [],
        types: [],
        ruleSystems: [
          facet('d20_5e', 'd20 5e', 5),
          facet('year_zero', 'year zero', 5),
          facet('osr', 'osr', 2),
          facet('coriolis', 'coriolis', 1),
        ],
        publishers: [facet('pub_free_league', 'Free League Publishing', 5)],
      },
    },
    'GET /titles': ({ params }) => {
      const system = params.get('system')
      const items = system
        ? [title(`ttl_${system}_1`, { title: `Best of ${system}` })]
        : [title('ttl_any')]
      return {
        body: {
          items,
          total: system ? 1 : 21,
          page: 1,
          pageSize: Number(params.get('pageSize')),
        },
      }
    },
    'GET /titles/ttl_bells': {
      body: {
        ...title('ttl_bells', { title: 'Drowned Bells' }),
        description: 'Bells under the sea.',
        authors: [{ id: 'a', name: 'Ann' }],
        pageCount: 131,
      },
    },
    'GET /titles/ttl_gloam': {
      body: {
        ...title('ttl_gloam', { title: 'Gloamwood' }),
        description: 'A wilderness toolkit.',
        authors: [],
        pageCount: 64,
      },
    },
    'GET /titles/ttl_eberron': {
      body: { ...title('ttl_eberron'), description: '', authors: [] },
    },
    'GET /publishers/pub_free_league': {
      body: {
        id: 'pub_free_league',
        name: 'Free League Publishing',
        logo: null,
        titleCount: 187,
        following: false,
      },
    },
    ...overrides,
  })
}

describe('HomePage', () => {
  it('shows the banner and the sale titles as promos', async () => {
    mockHome()
    await renderWithProviders(<HomePage />)

    expect(
      await screen.findByRole('heading', { name: 'Autumn of Horror sale' }),
    ).toBeVisible()
    const promos = screen.getByRole('region', { name: 'Discounts & Promos' })
    expect(
      within(promos).getByRole('link', { name: /Imperium Maledictum/ }),
    ).toHaveTextContent('-20%')
    expect(
      within(promos).getByRole('link', { name: 'View more' }),
    ).toHaveAttribute('href', '/titles?onSale=true')
  })

  it('switches title lists, previewing the title under the pointer', async () => {
    mockHome()
    const { user: u } = await renderWithProviders(<HomePage />)

    const tabs = await screen.findByRole('tablist', { name: 'Title lists' })
    // only lists with titles get a tab
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['New Releases', 'Bestselling', 'Specials'])
    const panel = screen.getByRole('tabpanel')
    expect(
      within(panel).getByRole('complementary', {
        name: 'Preview: Drowned Bells',
      }),
    ).toBeInTheDocument()
    expect(
      await within(panel).findByText('Bells under the sea.'),
    ).toBeInTheDocument()
    expect(
      within(panel).getByText('By Ann, Red Door Games'),
    ).toBeInTheDocument()
    expect(
      within(panel).getByRole('button', { name: 'Add to Cart: Drowned Bells' }),
    ).toHaveTextContent('Add to Cart - $19.99')

    await u.hover(within(panel).getByRole('link', { name: /^Gloamwood/ }))
    expect(
      within(panel).getByRole('complementary', { name: 'Preview: Gloamwood' }),
    ).toBeInTheDocument()

    await u.click(within(tabs).getByRole('tab', { name: 'Bestselling' }))
    expect(
      within(tabs).getByRole('tab', { name: 'Bestselling' }),
    ).toHaveAttribute('aria-selected', 'true')
    expect(
      // the row, not the preview's title link
      within(screen.getByRole('tabpanel')).getAllByRole('link', {
        name: /^Exploring Eberron/,
      })[0],
    ).toHaveAttribute('href', '/titles/ttl_eberron')
  })

  it('features the three biggest rule systems', async () => {
    mockHome()
    await renderWithProviders(<HomePage />)

    const featured = await screen.findByRole('region', {
      name: 'Featured for you',
    })
    await waitFor(() =>
      expect(
        within(featured)
          .getAllByRole('heading', { level: 3 })
          .map((h) => h.textContent),
      ).toEqual(['D20 / 5e', 'Year Zero Engine', 'OSR']),
    )
    expect(
      await within(featured).findByRole('link', { name: /Best of year_zero/ }),
    ).toBeVisible()
  })

  it('counts the catalogue', async () => {
    mockHome()
    await renderWithProviders(<HomePage />)

    expect(
      await screen.findByText('21 titles · 4 systems · updated daily'),
    ).toBeVisible()
    // a publisher opens the listing filtered by it
    expect(
      screen.getByRole('link', { name: 'Free League Publishing' }),
    ).toHaveAttribute('href', '/titles?publisher=pub_free_league')
    expect(
      screen.getByRole('link', { name: 'Browse all titles' }),
    ).toHaveAttribute('href', '/titles')
  })

  it('shows recently viewed titles only once there are some', async () => {
    mockHome()
    await renderWithProviders(<HomePage />)
    await screen.findByRole('region', { name: 'Featured for you' })
    expect(screen.queryByRole('region', { name: 'Recently Viewed' })).toBeNull()

    act(() =>
      useRecentlyViewed
        .getState()
        .record({ id: 'ttl_vaesen', title: 'Vaesen', coverUrl: null }),
    )

    const recent = await screen.findByRole('region', {
      name: 'Recently Viewed',
    })
    expect(
      within(recent).getByRole('link', { name: 'Vaesen' }),
    ).toHaveAttribute('href', '/titles/ttl_vaesen')
  })
})

describe('useRecentlyViewed', () => {
  it('keeps the latest ten, newest first, without repeats', () => {
    for (let index = 0; index < 12; index++)
      useRecentlyViewed
        .getState()
        .record({ id: `t${index}`, title: `T${index}`, coverUrl: null })
    useRecentlyViewed
      .getState()
      .record({ id: 't5', title: 'T5', coverUrl: null })

    const ids = useRecentlyViewed.getState().titles.map((viewed) => viewed.id)
    expect(ids).toHaveLength(10)
    expect(ids.slice(0, 3)).toEqual(['t5', 't11', 't10'])
    expect(new Set(ids).size).toBe(10)
  })
})

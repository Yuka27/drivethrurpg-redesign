import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { HomePage } from './home-page'
import type { TitleSummary } from '@/api/titles'
import { useFollowingSeen } from '@/stores/following-seen'
import { useRecentlyViewed } from '@/stores/recently-viewed'
import { apiError, mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { libraryItem } from '@/test/library'
import { renderWithProviders } from '@/test/render'

afterEach(() => useRecentlyViewed.setState({ titles: [] }))

const usd = (amount: number) => ({ amount, currency: 'USD' })
const facet = (value: string, label: string, count: number) => ({
  value,
  label,
  count,
})
const never = () => new Promise<never>(() => {})

function title(
  id: string,
  overrides: Partial<TitleSummary> = {},
): TitleSummary {
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
    // signed in, following nothing yet
    'GET /following': { body: { items: [] } },
    'GET /following/feed': { body: { items: [] } },
    'GET /library': { body: { items: [] } },
    'GET /wishlist': { body: { items: [], total: 0 } },
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
    ).toEqual(['New Releases', 'Following', 'Bestselling', 'Specials'])
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

  it('falls back to the three biggest rule systems without genres', async () => {
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

describe('HomePage while loading', () => {
  it('outlines the sections instead of leaving them out', async () => {
    mockHome({
      'GET /home': never,
      'GET /titles/facets': never,
      'GET /titles': never,
    })
    await renderWithProviders(<HomePage />)

    expect(await screen.findByText('Loading…')).toHaveAttribute(
      'role',
      'status',
    )
    expect(
      screen.queryByRole('region', { name: 'Discounts & Promos' }),
    ).toBeNull()
    // the catalogue banner is there at once, its numbers to come
    expect(
      screen.getByRole('link', { name: 'Browse all titles' }),
    ).toBeVisible()
  })
})

describe('the Following tab', () => {
  const follows = {
    items: [
      {
        type: 'publisher',
        publisher: { id: 'pub_red_door', name: 'Red Door Games' },
        followedAt: '2026-01-01T10:00:00Z',
        emailNewReleases: true,
      },
      {
        type: 'rule_system',
        target: { id: 'year_zero', name: 'Year Zero Engine' },
        followedAt: '2026-02-01T10:00:00Z',
        emailNewReleases: false,
      },
    ],
  }
  const feed = {
    items: [
      {
        ...title('ttl_crown', { title: 'Hollow Crown' }),
        releaseDate: '2026-10-01',
      },
      {
        ...title('ttl_frost', {
          title: 'Frost Lines',
          publisher: { id: 'pub_other', name: 'Other House' },
          ruleSystem: 'year_zero',
        }),
        releaseDate: '2026-09-20',
      },
    ],
  }
  afterEach(() => useFollowingSeen.setState({ seen: {} }))
  const tabNames = () =>
    screen.getAllByRole('tab').map((tab) => tab.textContent.trim())
  const panel = () => screen.getByRole('tabpanel')

  it('is not there for a guest', async () => {
    mockHome({ 'GET /me': apiError(401, 'unauthorized') })
    await renderWithProviders(<HomePage />)

    await screen.findByRole('tab', { name: 'New Releases' })
    expect(tabNames()).not.toContain('Following')
  })

  it('invites a user who follows nothing to start', async () => {
    mockHome()
    const { user: u } = await renderWithProviders(<HomePage />)

    await u.click(await screen.findByRole('tab', { name: 'Following' }))

    expect(
      await within(panel()).findByText(
        'Follow a publisher, imprint or system to see their new releases here.',
      ),
    ).toBeVisible()
    expect(
      within(panel()).getByRole('link', { name: 'Go to Following' }),
    ).toHaveAttribute('href', '/following')
  })

  it('lists what is new from what the user follows, saying why, and marks it seen', async () => {
    mockHome({
      'GET /following': { body: follows },
      'GET /following/feed': { body: feed },
    })
    const { user: u } = await renderWithProviders(<HomePage />)

    // second, after New Releases, with a dot for unseen releases
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('tab')
          .map((tab) => tab.getAttribute('aria-label') ?? tab.textContent),
      ).toEqual(['New Releases', 'Following new', 'Bestselling', 'Specials']),
    )
    // New Releases: a chip on rows from a followed publisher
    expect(within(panel()).getAllByText('Following')).not.toHaveLength(0)

    await u.click(screen.getByRole('tab', { name: 'Following new' }))

    expect(
      await within(panel()).findByText('New from Red Door Games'),
    ).toBeVisible()
    expect(within(panel()).getByText('New for Year Zero Engine')).toBeVisible()
    expect(useFollowingSeen.getState().seen[user.id]).toBe('2026-10-01')

    await u.click(screen.getByRole('tab', { name: 'New Releases' }))
    expect(screen.getByRole('tab', { name: 'Following' })).toBeVisible()
  })

  it('is hidden when the feed is not there', async () => {
    mockHome({
      'GET /following': { body: follows },
      'GET /following/feed': apiError(404, 'not_found'),
    })
    await renderWithProviders(<HomePage />)

    await screen.findByRole('tab', { name: 'New Releases' })
    await waitFor(() => expect(tabNames()).not.toContain('Following'))
  })
})

describe('Featured for you', () => {
  const genres = {
    formats: [],
    types: [],
    ruleSystems: [facet('osr', 'osr', 2)],
    publishers: [],
    genres: [
      facet('horror', 'Horror', 6),
      facet('fantasy', 'Fantasy', 8),
      facet('sci_fi', 'Sci-Fi', 4),
      facet('mystery', 'Mystery', 2),
    ],
  }
  /** Each group's heading and reason, once all three are there. */
  const groups = async () => {
    const featured = await screen.findByRole('region', {
      name: /Featured for you|Popular this week/,
    })
    await waitFor(() =>
      expect(
        within(featured).getAllByRole('heading', { level: 3 }),
      ).toHaveLength(3),
    )
    return within(featured)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => [
        heading.textContent,
        heading.nextElementSibling?.textContent,
      ])
  }

  it('groups by the biggest genres and says why each is there', async () => {
    const { params } = mockHome({
      'GET /titles/facets': { body: genres },
      'GET /library': {
        body: {
          items: [
            libraryItem('l1', { genre: 'fantasy' }),
            libraryItem('l2', { genre: 'fantasy' }),
            libraryItem('l3', { genre: 'fantasy' }),
            libraryItem('l4', { genre: 'horror' }),
          ],
        },
      },
      'GET /wishlist': {
        body: {
          items: [
            { titleId: 'w1', title: 'W', price: usd(999), genre: 'sci_fi' },
          ],
          total: 1,
        },
      },
    })
    await renderWithProviders(<HomePage />)

    await waitFor(async () =>
      expect(await groups()).toEqual([
        ['Fantasy', 'Because you own 3 Fantasy titles'],
        ['Horror', 'Because you own 1 Horror title'],
        ['Sci-Fi', 'Because it’s on your wishlist'],
      ]),
    )
    expect(
      params('GET /titles').some((sent) => sent.get('genre') === 'fantasy'),
    ).toBe(true)
  })

  it('shows a guest what is popular, without the "why"', async () => {
    mockHome({
      'GET /me': apiError(401, 'unauthorized'),
      'GET /titles/facets': { body: genres },
    })
    await renderWithProviders(<HomePage />)

    expect(
      await screen.findByRole('heading', { name: 'Popular this week' }),
    ).toBeVisible()
    expect((await groups())[0]).toEqual(['Fantasy', 'Popular in Fantasy'])
    expect(
      screen.queryByRole('button', { name: 'Why am I seeing this?' }),
    ).toBeNull()
  })

  it('explains the picks in a popover that links to preferences', async () => {
    mockHome({ 'GET /titles/facets': { body: genres } })
    const { user: u } = await renderWithProviders(<HomePage />)

    const why = await screen.findByRole('button', {
      name: 'Why am I seeing this?',
    })
    await u.click(why)

    expect(
      await screen.findByText(
        /These genres come from the titles in your library/,
      ),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Edit your preferences' }),
    ).toHaveAttribute('href', '/account/preferences')

    await u.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByText(/These genres come from/)).toBeNull(),
    )
    expect(why).toHaveFocus()
  })
})

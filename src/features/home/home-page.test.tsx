import { act, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { HomePage } from './home-page'
import type { TitleSummary } from '@/api/titles'
import { useFollowingSeen } from '@/stores/following-seen'
import { useRecentlyViewed } from '@/stores/recently-viewed'
import { apiError, facet, mockApi, never, usd, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { libraryItem } from '@/test/library'
import { pdfEdition, previewOf } from '@/test/preview'
import { renderWithProviders } from '@/test/render'

afterEach(() => useRecentlyViewed.setState({ titles: [] }))

function title(
  id: string,
  overrides: Partial<TitleSummary> = {},
): TitleSummary {
  return {
    id,
    title: `Title ${id}`,
    publisher: { id: 'pub_green_ronin', name: 'Green Ronin Publishing' },
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
    payWhatYouWant: false,
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
            image: { url: '/img/hero/autumn.jpg', alt: '' },
            contentSide: 'right',
            autoplayMs: 6000,
          },
        ],
        heroOptions: null,
        promos: [
          {
            id: 'promo_horror',
            label: 'Seasonal sale',
            discountLabel: 'Up to 30% off',
            title: 'Autumn of Horror',
            subtitle: 'Vaesen, Coriolis and more',
            art: { url: '/img/promos/autumn-of-horror.jpg', alt: '' },
            link: '/titles?onSale=true&genre=horror',
            endsAt: '2026-10-31T12:00:00Z',
          },
        ],
        publishers: [
          {
            id: 'pub_free_league',
            name: 'Free League Publishing',
            logo: {
              url: '/img/publishers/pub_free_league.png',
              alt: 'Free League Publishing logo',
            },
            titleCount: 187,
            following: true,
          },
          {
            id: 'pub_chaosium',
            name: 'Chaosium Inc.',
            logo: {
              url: '/img/publishers/pub_chaosium.png',
              alt: 'Chaosium Inc. logo',
            },
            titleCount: 260,
            following: false,
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
              title('ttl_dead_air', { title: 'Dead Air' }),
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
    'GET /titles/ttl_dead_air/preview': {
      body: previewOf('ttl_dead_air', {
        title: 'Dead Air',
        publisher: { id: 'pub_green_ronin', name: 'Green Ronin Publishing' },
        shortDescription: 'A radio show for the end of the world.',
        editions: [pdfEdition({ price: usd(1999), onSale: false })],
      }),
    },
    'GET /titles/ttl_gloam/preview': {
      body: previewOf('ttl_gloam', { title: 'Gloamwood' }),
    },
    'GET /titles/ttl_eberron/preview': {
      body: previewOf('ttl_eberron', { title: 'Exploring Eberron' }),
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
  it('shows the hero and the promo campaigns', async () => {
    mockHome()
    await renderWithProviders(<HomePage />)

    expect(
      await screen.findByRole('heading', { name: 'Autumn of Horror sale' }),
    ).toBeVisible()
    // the API's wide image, its empty alt standing in with the banner's title
    expect(
      screen.getByRole('img', { name: 'Autumn of Horror sale' }),
    ).toHaveAttribute('src', expect.stringMatching(/\/img\/hero\/autumn\.jpg$/))
    const promos = screen.getByRole('region', { name: 'Discounts & Promos' })
    const promo = within(promos).getByRole('link', {
      name: /Autumn of Horror/,
    })
    expect(promo).toHaveAttribute('href', '/titles?onSale=true&genre=horror')
    expect(promo).toHaveTextContent('Up to 30% off')
    expect(promo).toHaveTextContent('Vaesen, Coriolis and more · Ends Oct 31')
    // the art as the API gives it, whatever its type
    expect(promo.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringMatching(/\/img\/promos\/autumn-of-horror\.jpg$/),
    )
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
      await within(panel).findByRole('complementary', {
        name: 'Preview: Dead Air',
      }),
    ).toBeInTheDocument()
    expect(
      await within(panel).findByText('A radio show for the end of the world.'),
    ).toBeInTheDocument()
    // the publisher alone, no "By …"
    expect(within(panel).getByText('Green Ronin Publishing')).toBeVisible()
    expect(
      within(panel).getByRole('button', { name: 'Add to Cart · $19.99' }),
    ).toBeVisible()

    // the panel follows the pointer after a moment
    await u.hover(within(panel).getByRole('link', { name: /^Gloamwood/ }))
    expect(
      await within(panel).findByRole('complementary', {
        name: 'Preview: Gloamwood',
      }),
    ).toBeInTheDocument()
    // and keyboard focus does the same
    within(panel)
      .getByRole('link', { name: /^Dead Air/ })
      .focus()
    expect(
      await within(panel).findByRole('complementary', {
        name: 'Preview: Dead Air',
      }),
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
    expect(
      screen.getByRole('link', { name: 'Browse all titles' }),
    ).toHaveAttribute('href', '/titles')
  })

  it('shows the publishers GET /home picks, with their logos', async () => {
    mockHome()
    await renderWithProviders(<HomePage />)

    const strip = await screen.findByRole('region', {
      name: 'Browse by Publisher',
    })
    const links = within(strip).getAllByRole('link')
    expect(links.map((link) => link.getAttribute('aria-label'))).toEqual([
      'Free League Publishing',
      'Chaosium Inc.',
    ])
    // a publisher opens the listing filtered by it
    expect(links[0]).toHaveAttribute(
      'href',
      '/titles?publisher=pub_free_league',
    )
    expect(links[1].querySelector('img')).toHaveAttribute(
      'src',
      expect.stringMatching(/\/img\/publishers\/pub_chaosium\.png$/),
    )
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

  it('clears recently viewed, and Undo brings them back', async () => {
    const success = vi.spyOn(toast, 'success')
    useRecentlyViewed.setState({
      titles: [
        { id: 'ttl_vaesen', title: 'Vaesen', coverUrl: null },
        { id: 'ttl_coriolis', title: 'Coriolis', coverUrl: null },
      ],
    })
    mockHome()
    const { user: u } = await renderWithProviders(<HomePage />)

    const recent = await screen.findByRole('region', {
      name: 'Recently Viewed',
    })
    await u.click(
      within(recent).getByRole('button', { name: 'Clear recently viewed' }),
    )

    expect(screen.queryByRole('region', { name: 'Recently Viewed' })).toBeNull()
    expect(useRecentlyViewed.getState().titles).toEqual([])
    expect(success).toHaveBeenCalledWith(
      'Recently viewed cleared.',
      expect.anything(),
    )

    const options = success.mock.calls[0]?.[1] as {
      action: { label: string; onClick: () => void }
    }
    expect(options.action.label).toBe('Undo')
    act(() => options.action.onClick())
    expect(
      await screen.findByRole('region', { name: 'Recently Viewed' }),
    ).toBeVisible()
    expect(useRecentlyViewed.getState().titles.map((t) => t.id)).toEqual([
      'ttl_vaesen',
      'ttl_coriolis',
    ])
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

    // a "Loading…" per region still loading: hero, promos, lists
    const loading = await screen.findAllByText('Loading…')
    expect(loading.length).toBeGreaterThan(0)
    for (const status of loading)
      expect(status).toHaveAttribute('role', 'status')
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
        publisher: { id: 'pub_green_ronin', name: 'Green Ronin Publishing' },
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

  it('says the feed covers genres and series to one who follows only those', async () => {
    mockHome({
      'GET /following': {
        body: {
          items: [
            {
              type: 'genre',
              target: { id: 'horror', name: 'Horror', following: true },
              followedAt: '2026-03-09T10:00:00Z',
              emailNewReleases: true,
            },
            {
              type: 'product_line',
              target: { id: 'pl_vaesen', name: 'Vaesen', following: true },
              followedAt: '2026-04-01T10:00:00Z',
              emailNewReleases: true,
            },
          ],
        },
      },
      // the API's feed lists followed publishers' titles only, for now
      'GET /following/feed': { body: { items: [] } },
    })
    const { user: u } = await renderWithProviders(<HomePage />)

    await u.click(await screen.findByRole('tab', { name: 'Following' }))

    expect(
      await within(panel()).findByText(
        'This feed covers the genres and series you follow too: their new releases will show up here.',
      ),
    ).toBeVisible()
    expect(
      within(panel()).getByRole('link', { name: 'Go to Following' }),
    ).toHaveAttribute('href', '/following')
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
      await within(panel()).findByText('New from Green Ronin Publishing'),
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

describe('the title lists', () => {
  const TABS = [
    ['new', 'New Releases'],
    ['bestselling', 'Bestselling'],
    ['sale', 'Specials'],
    ['free', 'Free & PWYW'],
  ] as const

  /** GET /home with `count` titles in each of the four lists. */
  function mockLists(
    count: number,
    extra: (
      section: string,
      index: number,
    ) => Partial<TitleSummary> = () => ({}),
  ) {
    const handlers: Record<string, Handler> = {
      'GET /home': {
        body: {
          hero: [],
          promos: [],
          publishers: [],
          sections: TABS.map(([id]) => ({
            id,
            title: id,
            titles: Array.from({ length: count }, (_, index) =>
              title(`ttl_${id}_${index + 1}`, {
                title: `${id} ${index + 1}`,
                ...extra(id, index),
              }),
            ),
          })),
        },
      },
    }
    // each tab's first row loads its preview with the tab
    for (const [id] of TABS) handlers[`GET /titles/ttl_${id}_1/preview`] = never
    return mockHome(handlers)
  }

  /** The rows of the open tab (its first list: the panel has lists too). */
  const rows = () =>
    within(within(screen.getByRole('tabpanel')).getAllByRole('list')[0])
      .getAllByRole('listitem')
      .map((row) => row.textContent)

  it('shows ten rows in each list', async () => {
    mockLists(10)
    const { user: u } = await renderWithProviders(<HomePage />)

    for (const [id, name] of TABS) {
      await u.click(await screen.findByRole('tab', { name }))
      expect(rows()).toHaveLength(10)
      expect(rows()[9]).toContain(`${id} 10`)
    }
  })

  it('shows no more than ten', async () => {
    mockLists(12)
    const { user: u } = await renderWithProviders(<HomePage />)

    for (const [id, name] of TABS) {
      await u.click(await screen.findByRole('tab', { name }))
      expect(rows()).toHaveLength(10)
      expect(rows().join()).not.toContain(`${id} 11`)
    }
  })

  it('says "Pay what you want" for such a title, and "Free" for a free one', async () => {
    mockLists(3, (section, index) =>
      section !== 'free'
        ? {}
        : index === 0
          ? { price: usd(0), listPrice: usd(0) }
          : index === 1
            ? { payWhatYouWant: true, price: usd(1299), listPrice: usd(1299) }
            : {},
    )
    const { user: u } = await renderWithProviders(<HomePage />)

    await u.click(await screen.findByRole('tab', { name: 'Free & PWYW' }))
    expect(rows()[0]).toContain('Free')
    expect(rows()[1]).toContain('Pay what you want')
    expect(rows()[1]).not.toContain('$12.99')
    expect(rows()[2]).toContain('$19.99')
  })
})

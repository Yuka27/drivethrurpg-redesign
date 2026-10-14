import { act, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { TitlePage } from './title-page'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { apiError, mockApi, never, user } from '@/test/api'
import { renderWithProviders } from '@/test/render'
import { mockTitle, vaesen } from '@/test/title'

async function renderTitle() {
  const result = await renderWithProviders(<TitlePage titleId="ttl_vaesen" />)
  await screen.findByRole('heading', {
    level: 1,
    name: 'Vaesen: City of My Nightmares',
  })
  return result
}

const buy = () => screen.getByRole('region', { name: 'Buy' })
const header = () =>
  screen.getByRole('heading', { level: 1 }).closest('header') as HTMLElement

describe('TitlePage', () => {
  it('shows the title, its rating and tags', async () => {
    mockTitle()
    await renderTitle()

    expect(
      screen.getByText('Nils Karlén · Free League Publishing'),
    ).toBeVisible()
    expect(
      within(header()).getByRole('img', { name: 'Rated 4.8 out of 5' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Very Positive')).toBeVisible()
    const tags = within(screen.getByRole('list', { name: 'Tags' }))
    expect(tags.getByText('Adventure')).toBeVisible()
    expect(tags.getByText('Year Zero Engine')).toBeVisible()
    expect(tags.getByText('Human-centered without AI')).toBeVisible()
  })

  it('leads with the short description, and gives the whole one in Overview', async () => {
    mockTitle()
    await renderTitle()

    expect(
      within(header()).getByText('Stockholm, 1897: the monsters are real.'),
    ).toBeInTheDocument()
    const overview = screen.getByRole('region', { name: 'Overview' })
    expect(within(overview).getByText('A city of nightmares.')).toBeVisible()
    expect(within(overview).getByText('Second paragraph.')).toBeVisible()
    // the header does not repeat the description
    expect(screen.getAllByText('A city of nightmares.')).toHaveLength(1)
  })

  it('leaves the lead out when there is no short description', async () => {
    mockTitle({
      'GET /titles/ttl_vaesen': { body: { ...vaesen, shortDescription: null } },
    })
    await renderTitle()

    expect(within(header()).queryByText('A city of nightmares.')).toBeNull()
    expect(
      within(header()).queryByText('Stockholm, 1897: the monsters are real.'),
    ).toBeNull()
  })

  it('lets the buyer pick an edition, then adds that one', async () => {
    const success = vi.spyOn(toast, 'success')
    const { bodies } = mockTitle({
      'POST /cart/items': { status: 201, body: {} },
    })
    const { user: u } = await renderTitle()

    const editions = within(buy()).getByRole('radiogroup', { name: 'Edition' })
    expect(within(editions).getByRole('radio', { name: /^PDF/ })).toBeChecked()
    expect(
      within(editions).getByRole('radio', { name: /^Box set/ }),
    ).toBeDisabled()
    expect(
      within(editions).getByRole('radio', { name: /^Hardcover/ }),
    ).toHaveTextContent('Ships from Sweden')

    await u.click(within(editions).getByRole('radio', { name: /^Hardcover/ }))
    const add = within(buy()).getByRole('button', {
      name: 'Add to Cart - $44.99',
    })
    await u.click(add)

    await waitFor(() =>
      expect(bodies('POST /cart/items')).toEqual([
        { sku: 'sku_print', qty: 1 },
      ]),
    )
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        'Vaesen: City of My Nightmares is in your cart.',
        expect.anything(),
      ),
    )
  })

  it('marks the cart as a gift when asked', async () => {
    const { bodies } = mockTitle({
      'POST /cart/items': { status: 201, body: {} },
      'PUT /cart/gift': { body: {} },
    })
    const { user: u } = await renderTitle()

    await u.click(within(buy()).getByRole('switch', { name: 'Buy as a gift' }))
    await u.click(
      within(buy()).getByRole('button', { name: 'Add to Cart - $19.99' }),
    )

    await waitFor(() =>
      expect(bodies('PUT /cart/gift')).toEqual([{ enabled: true }]),
    )
  })

  it('sends an owner of the digital edition to the library instead', async () => {
    mockTitle({
      'GET /titles/ttl_vaesen': { body: { ...vaesen, owned: true } },
    })
    await renderTitle()

    expect(
      within(buy()).getByRole('link', { name: 'In your library' }),
    ).toHaveAttribute('href', '/library')
    expect(
      within(buy()).queryByRole('switch', { name: 'Buy as a gift' }),
    ).toBeNull()
  })

  it('says when a title is no longer sold, and that an owner keeps it', async () => {
    mockTitle({
      'GET /titles/ttl_vaesen': {
        body: { ...vaesen, available: false, owned: true },
      },
    })
    await renderWithProviders(<TitlePage titleId="ttl_vaesen" />)

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'This title is no longer available',
      }),
    ).toBeVisible()
    expect(screen.getByText(vaesen.title)).toBeVisible()
    expect(screen.getByRole('note')).toHaveTextContent(
      'Already own it? Your copy stays in your Library',
    )
    expect(
      screen.getByRole('link', { name: 'Go to my Library' }),
    ).toHaveAttribute('href', '/library')
    // similar titles instead
    expect(
      await screen.findByRole('link', {
        name: 'Coriolis: The Flowers of Algorab',
      }),
    ).toHaveAttribute('href', '/titles/ttl_coriolis')
  })

  it('lists what the title belongs to, each with its own switch', async () => {
    mockTitle()
    await renderTitle()

    const card = screen.getByRole('region', {
      name: 'Follow your favorite publishers and categories to receive a weekly email of new releases',
    })
    // the API's order, each saying what it follows
    expect(
      within(card)
        .getAllByRole('switch')
        .map((toggle) => toggle.getAttribute('aria-label')),
    ).toEqual([
      'Follow publisher Free League Publishing',
      'Follow series Vaesen',
      'Follow game system Year Zero Engine',
      'Follow genre Horror',
    ])
    expect(
      within(card).getByRole('switch', { name: 'Follow series Vaesen' }),
    ).toBeChecked()
    expect(within(card).getByText('Game system')).toBeVisible()
  })

  it.each([
    ['Follow series Vaesen', 'DELETE /product-lines/pl_vaesen/follow', false],
    ['Follow genre Horror', 'POST /genres/horror/follow', true],
    [
      'Follow game system Year Zero Engine',
      'POST /rule-systems/year_zero/follow',
      true,
    ],
  ] as const)('%s calls %s', async (name, request, checked) => {
    // the API never answers: what shows is the optimistic state
    const { bodies } = mockTitle({ [request]: never })
    const { user: u } = await renderTitle()

    const toggle = screen.getByRole('switch', { name })
    await waitFor(() => expect(toggle).toBeEnabled())
    await u.click(toggle)

    // at once, before the API answers
    expect(toggle).toHaveAttribute('aria-checked', String(checked))
    await waitFor(() => expect(bodies(request)).toHaveLength(1))
  })

  it('puts a switch back when following fails', async () => {
    const error = vi.spyOn(toast, 'error')
    const { bodies } = mockTitle({
      // fails a moment later, once the switch has moved
      'POST /genres/horror/follow': () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(apiError(503, 'unavailable')), 50),
        ),
    })
    const { user: u } = await renderTitle()

    const toggle = screen.getByRole('switch', { name: 'Follow genre Horror' })
    await waitFor(() => expect(toggle).toBeEnabled())
    await u.click(toggle)
    expect(toggle).toBeChecked()

    await waitFor(() => expect(toggle).not.toBeChecked())
    expect(error).toHaveBeenCalled()
    expect(bodies('POST /genres/horror/follow')).toHaveLength(1)
  })

  it('follows the publisher, and keeps it once the API agrees', async () => {
    let following = false
    const { bodies } = mockTitle({
      'POST /publishers/pub_free_league/follow': () => {
        following = true
        return { body: { following } }
      },
      // the refetch after the follow sees it
      'GET /titles/ttl_vaesen': () => ({
        body: {
          ...vaesen,
          followTargets: vaesen.followTargets.map((target) =>
            target.type === 'publisher' ? { ...target, following } : target,
          ),
        },
      }),
    })
    const { user: u } = await renderTitle()

    const follow = await screen.findByRole('switch', {
      name: 'Follow publisher Free League Publishing',
    })
    await waitFor(() => expect(follow).toBeEnabled())
    await u.click(follow)
    expect(follow).toBeChecked()
    await waitFor(() =>
      expect(bodies('POST /publishers/pub_free_league/follow')).toHaveLength(1),
    )
    await waitFor(() => expect(follow).toBeChecked())
  })

  it('asks a guest to log in before following', async () => {
    const { bodies } = mockTitle({}, apiError(401, 'unauthorized'))
    const { user: u } = await renderTitle()

    // a guest follows nothing, whatever the data says
    const series = screen.getByRole('switch', { name: 'Follow series Vaesen' })
    await waitFor(() => expect(series).toBeEnabled())
    expect(series).not.toBeChecked()
    await u.click(screen.getByRole('switch', { name: 'Follow genre Horror' }))

    expect(useAuthDialogStore.getState()).toMatchObject({
      open: true,
      view: 'login',
    })
    expect(bodies('POST /genres/horror/follow')).toHaveLength(0)
    useAuthDialogStore.getState().setOpen(false)
  })

  it('shows the sample pages, each opening larger', async () => {
    mockTitle()
    const { user: u } = await renderTitle()

    const page = await screen.findByRole('button', {
      name: 'Map of the city · 1 / 2',
    })
    expect(
      screen.getByRole('button', { name: 'Preview page · 2 / 2' }),
    ).toBeVisible()
    await u.click(page)

    const dialog = await screen.findByRole('dialog', {
      name: 'Map of the city · 1 / 2',
    })
    expect(
      within(dialog).getByRole('img', { name: 'Map of the city' }),
    ).toBeVisible()
  })

  it('leaves samples out when the title has none', async () => {
    const { params } = mockTitle({
      'GET /titles/ttl_vaesen/samples': {
        body: { previewPages: [], sampleFileUrl: null },
      },
    })
    await renderTitle()

    // the answer has arrived and been drawn: still no samples
    await waitFor(() =>
      expect(params('GET /titles/ttl_vaesen/samples')).toHaveLength(1),
    )
    await act(async () => {})
    expect(screen.getByText('Second paragraph.')).toBeVisible()
    expect(screen.queryByText('Sample pages')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Download sample' })).toBeNull()
  })

  it('offers no sample download without a sample file', async () => {
    mockTitle({
      'GET /titles/ttl_vaesen/samples': {
        body: {
          previewPages: [{ url: '/img/p1.jpg', alt: 'Map of the city' }],
          sampleFileUrl: null,
        },
      },
    })
    await renderTitle()

    expect(
      await screen.findByRole('button', { name: 'Map of the city · 1 / 1' }),
    ).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Download sample' })).toBeNull()
  })

  it.each([
    ['es', 'Spanish'],
    ['ko', 'Korean'],
  ])('names the language %s in words', async (language, name) => {
    mockTitle({
      'GET /titles/ttl_vaesen': { body: { ...vaesen, language } },
    })
    await renderTitle()

    expect(within(buy()).getByText(name)).toBeVisible()
  })

  it('links the sample PDF under the tags, in a new tab', async () => {
    mockTitle()
    await renderTitle()

    const link = within(header()).getByRole('link', {
      name: 'Preview PDF, opens in a new tab',
    })
    // the file is on the API's origin, not under /api/v1
    expect(link).toHaveAttribute(
      'href',
      expect.stringMatching(/^https?:\/\/[^/]+\/files\/sample\.pdf$/),
    )
    expect(link.getAttribute('href')).not.toContain('/api/v1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(link).toHaveAccessibleDescription('First 12 pages · PDF · 10.6 MB')
    // right under the tags
    expect(
      within(header()).getByRole('list', { name: 'Tags' }).nextElementSibling,
    ).toBe(link)
  })

  it('leaves no PDF link, and no gap, when there is no sample file', async () => {
    mockTitle({
      'GET /titles/ttl_vaesen': { body: { ...vaesen, sampleFile: null } },
    })
    await renderTitle()

    expect(
      within(header()).queryByRole('link', { name: /Preview PDF/ }),
    ).toBeNull()
    expect(
      within(header()).getByRole('list', { name: 'Tags' }).nextElementSibling
        ?.tagName,
    ).not.toBe('A')
  })

  it('says "First page" for a one-page sample', async () => {
    mockTitle({
      'GET /titles/ttl_vaesen': {
        body: {
          ...vaesen,
          sampleFile: { url: '/files/one.pdf', pageCount: 1, sizeMb: 0.4 },
        },
      },
    })
    await renderTitle()

    expect(
      within(header()).getByRole('link', { name: /Preview PDF/ }),
    ).toHaveAccessibleDescription('First page · PDF · 0.4 MB')
  })

  it('lists the details that are known', async () => {
    mockTitle()
    await renderTitle()

    const details = screen.getByRole('region', { name: 'Details' })
    expect(within(details).getByText('Nov 21, 2023')).toBeVisible()
    expect(within(details).getByText('52 MB')).toBeVisible()
    expect(within(details).getByText('English, Polish')).toBeVisible()
    // no ISBN in the data: no row for it
    expect(within(details).queryByText('ISBN')).toBeNull()
  })

  it('merges reviews and discussions, newest first, five a page', async () => {
    mockTitle()
    const { user: u } = await renderTitle()

    const section = screen.getByRole('region', {
      name: 'Reviews & Discussions (6)',
    })
    await waitFor(() =>
      expect(within(section).getAllByRole('article')).toHaveLength(5),
    )
    const names = () =>
      within(section)
        .getAllByRole('article')
        .map((article) => article.querySelector('p')?.textContent)
    // the discussion's last reply is the newest
    expect(names()).toEqual([
      'Davos S.',
      'Reader r1',
      'Reader r2',
      'Reader r3',
      'Reader r4',
    ])
    expect(within(section).getByText('7 replies')).toBeVisible()
    expect(within(section).getByText('Purchaser')).toBeVisible()

    // the histogram as shares of all reviews
    const bars = within(
      within(section).getByRole('list', { name: 'Ratings by stars' }),
    ).getAllByRole('listitem')
    expect(bars[0]).toHaveTextContent('60%')

    await u.click(within(section).getByRole('button', { name: 'Page 2' }))
    expect(names()).toEqual(['Reader r5'])
  })

  it('shows what customers also bought', async () => {
    mockTitle()
    await renderTitle()

    const also = await screen.findByRole('region', {
      name: 'Customers also bought',
    })
    expect(
      within(also).getByRole('link', {
        name: /Coriolis: The Flowers of Algorab/,
      }),
    ).toHaveAttribute('href', '/titles/ttl_coriolis')
    expect(
      within(also).getByRole('link', { name: 'See more recommendations' }),
    ).toHaveAttribute('href', '/titles?system=year_zero')
  })

  it('says so when the title does not exist', async () => {
    mockApi({
      'GET /me': { body: user },
      'GET /titles/ttl_nope': apiError(404, 'not_found'),
      'GET /titles/ttl_nope/reviews': apiError(404, 'not_found'),
      'GET /titles/ttl_nope/discussions': apiError(404, 'not_found'),
    })
    await renderWithProviders(<TitlePage titleId="ttl_nope" />)

    expect(
      await screen.findByRole('heading', {
        name: 'We could not find this title.',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Browse all titles' }),
    ).toHaveAttribute('href', '/titles')
  })
})

describe('TitlePage while loading', () => {
  it('outlines the page until the title arrives', async () => {
    mockTitle({ 'GET /titles/ttl_vaesen': never })
    await renderWithProviders(<TitlePage titleId="ttl_vaesen" />)

    expect(await screen.findByText('Loading…')).toHaveAttribute(
      'role',
      'status',
    )
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
  })

  it('names the reviews without a count until they arrive', async () => {
    mockTitle({
      'GET /titles/ttl_vaesen/reviews': never,
      'GET /titles/ttl_vaesen/discussions': never,
    })
    await renderTitle()

    expect(
      screen.getByRole('heading', { level: 2, name: 'Reviews & Discussions' }),
    ).toBeVisible()
  })
})

describe('sorting and filtering reviews', () => {
  const rated = (id: string, createdAt: string, helpfulCount: number) => ({
    id,
    author: { displayName: `Reader ${id}` },
    rating: 4,
    title: `Review ${id}`,
    body: `Body ${id}`,
    createdAt,
    verifiedOwner: false,
    helpfulCount,
  })
  // newest first, as GET …/reviews?sort=newest answers
  const newest = [
    rated('r1', '2026-08-15T10:00:00Z', 0),
    rated('r2', '2026-07-14T10:00:00Z', 12),
    rated('r3', '2026-06-01T10:00:00Z', 1),
    rated('r4', '2026-05-01T10:00:00Z', 36),
    rated('r5', '2026-04-01T10:00:00Z', 3),
  ]
  // the API's default order: most helpful first
  const helpful = [newest[3], newest[1], newest[4], newest[2], newest[0]]

  function mockReviews() {
    return mockTitle({
      'GET /titles/ttl_vaesen/reviews': ({ params }) => ({
        body: {
          items: params.get('sort') === 'newest' ? newest : helpful,
          total: 5,
          histogram: [0, 0, 0, 5, 0],
        },
      }),
    })
  }
  const section = () =>
    screen.getByRole('region', { name: 'Reviews & Discussions (6)' })
  const names = () =>
    within(section())
      .getAllByRole('article')
      .map((article) => article.querySelector('p')?.textContent)

  it('lists newest first, and "Most helpful" follows the API’s ranking', async () => {
    const { params } = mockReviews()
    const { user: u } = await renderTitle()

    await waitFor(() => expect(names()).toHaveLength(5))
    expect(names()).toEqual([
      'Davos S.',
      'Reader r1',
      'Reader r2',
      'Reader r3',
      'Reader r4',
    ])
    expect(params('GET /titles/ttl_vaesen/reviews')[0].get('sort')).toBe(
      'newest',
    )

    await u.click(
      within(section()).getByRole('combobox', { name: 'Sort reviews' }),
    )
    await u.click(await screen.findByRole('option', { name: 'Most helpful' }))

    await waitFor(() =>
      expect(names()).toEqual([
        'Reader r4',
        'Reader r2',
        'Reader r5',
        'Reader r3',
        'Reader r1',
      ]),
    )
    // the API's default order: no sort parameter
    expect(params('GET /titles/ttl_vaesen/reviews').at(-1)?.get('sort')).toBe(
      null,
    )
    // the thread (no helpful count) comes after the reviews
    await u.click(within(section()).getByRole('button', { name: 'Page 2' }))
    expect(names()).toEqual(['Davos S.'])
  })

  it('says how many found a review helpful, and nothing at zero', async () => {
    mockReviews()
    await renderTitle()

    await waitFor(() => expect(names()).toHaveLength(5))
    const article = (name: string) =>
      within(section())
        .getAllByRole('article')
        .find((item) => item.querySelector('p')?.textContent === name)!
    expect(article('Reader r4')).toHaveTextContent(
      '36 people found this helpful',
    )
    expect(article('Reader r3')).toHaveTextContent(
      '1 person found this helpful',
    )
    expect(
      within(article('Reader r1')).queryByText(/found this helpful/),
    ).toBeNull()
  })

  it('narrows the list to reviews or questions, counts adding up to the total', async () => {
    mockReviews()
    const { user: u } = await renderTitle()

    const chips = await within(section()).findByRole('group', {
      name: 'Show',
    })
    const chip = (name: RegExp) => within(chips).getByRole('button', { name })
    expect(chip(/^All/)).toHaveTextContent('All (6)')
    expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'true')
    expect(chip(/^Reviews/)).toHaveTextContent('Reviews (5)')
    expect(chip(/^Questions/)).toHaveTextContent('Questions (1)')

    await u.click(chip(/^Questions/))
    expect(names()).toEqual(['Davos S.'])
    expect(chip(/^Questions/)).toHaveAttribute('aria-pressed', 'true')

    await u.click(chip(/^Reviews/))
    expect(names()).toHaveLength(5)
    expect(names()).not.toContain('Davos S.')
  })
})

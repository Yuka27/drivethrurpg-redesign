import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { TitlePage } from './title-page'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { apiError, mockApi, user } from '@/test/api'
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
    // the header no longer repeats the description's first paragraph
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

  it('follows the publisher, and asks a guest to log in first', async () => {
    const { bodies } = mockTitle({
      'POST /publishers/pub_free_league/follow': { body: {} },
    })
    const { user: u } = await renderTitle()

    const follow = await screen.findByRole('switch', {
      name: 'Follow Free League Publishing',
    })
    await waitFor(() => expect(follow).toBeEnabled())
    await u.click(follow)
    expect(follow).toBeChecked()
    await waitFor(() =>
      expect(bodies('POST /publishers/pub_free_league/follow')).toHaveLength(1),
    )
  })

  it('asks a guest to log in before following', async () => {
    mockTitle({}, apiError(401, 'unauthorized'))
    const { user: u } = await renderTitle()

    await u.click(
      await screen.findByRole('switch', {
        name: 'Follow Free League Publishing',
      }),
    )

    expect(useAuthDialogStore.getState()).toMatchObject({
      open: true,
      view: 'login',
    })
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

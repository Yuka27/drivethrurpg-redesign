import { screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { WishlistPage } from './wishlist-page'
import { WishlistSearchSchema } from './wishlist-search'
import type { WishlistSearch } from './wishlist-search'
import { toTitleSummary } from '@/api/wishlist'
import type { WishlistItem } from '@/api/wishlist'
import { mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const usd = (amount: number) => ({ amount, currency: 'USD' })

function item(
  titleId: string,
  overrides: Partial<WishlistItem> = {},
): WishlistItem {
  return {
    titleId,
    title: `Title ${titleId}`,
    publisher: { id: 'pub_free_league', name: 'Free League Publishing' },
    cover: null,
    type: 'adventure',
    ruleSystem: 'year_zero',
    genre: null,
    format: 'pdf',
    price: usd(1999),
    listPrice: usd(1999),
    priceDrop: false,
    addedAt: '2026-10-01T10:00:00Z',
    owned: false,
    inCart: false,
    aiGenerated: false,
    ...overrides,
  }
}

const imperium = item('ttl_imperium', {
  title: 'Imperium Maledictum',
  publisher: { id: 'pub_cubicle7', name: 'Cubicle 7 Entertainment' },
  ruleSystem: 'imperium_maledictum',
  type: 'core_rulebook',
  price: usd(1999),
  listPrice: usd(2499),
  priceDrop: true,
  addedAt: '2026-10-02T10:00:00Z',
})
const vaesen = item('ttl_vaesen', { title: 'Vaesen', price: usd(4499) })
const coriolis = item('ttl_coriolis', {
  title: 'Coriolis',
  owned: true,
  addedAt: '2026-09-01T10:00:00Z',
})
const honk = item('ttl_honk', {
  title: 'The Honk Legion',
  inCart: true,
  addedAt: '2026-08-01T10:00:00Z',
})

function mockWishlist(
  items: Array<WishlistItem>,
  overrides: Record<string, Handler> = {},
) {
  return mockApi({
    'GET /me': { body: user },
    'GET /wishlist': { body: { items, total: items.length } },
    ...overrides,
  })
}

/** The route's job: keep the search, apply each change. */
function Harness({ initial = {} }: { initial?: Partial<WishlistSearch> }) {
  const [search, setSearch] = useState(() =>
    WishlistSearchSchema.parse(initial),
  )
  return (
    <WishlistPage
      search={search}
      onSearchChange={(patch) =>
        setSearch((previous) => ({ ...previous, ...patch }))
      }
    />
  )
}

async function renderWishlist(initial?: Partial<WishlistSearch>) {
  const result = await renderWithProviders(<Harness initial={initial} />)
  await screen.findByText(/^Showing/)
  return result
}

const results = () => screen.getAllByRole('list', { name: 'Wishlist' })[0]
const titlesShown = () =>
  within(results())
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent)

describe('WishlistPage', () => {
  it('shows the saved titles, newest first, with the sale banner', async () => {
    mockWishlist([vaesen, imperium, coriolis, honk])
    await renderWishlist()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Wishlist' }),
    ).toBeVisible()
    expect(screen.getByText('Showing 1–4 of 4')).toBeVisible()
    expect(titlesShown()).toEqual([
      'Imperium Maledictum',
      'Vaesen',
      'Coriolis',
      'The Honk Legion',
    ])
    // every heart is on: they are all on the wishlist
    for (const heart of within(results()).getAllByRole('button', {
      name: /^Wishlist:/,
    }))
      expect(heart).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('region', {
        name: '1 title on your wishlist is on sale.',
      }),
    ).toBeVisible()
  })

  it('filters in the browser, with live counts', async () => {
    mockWishlist([vaesen, imperium, coriolis])
    const { user: u } = await renderWishlist()

    await u.click(screen.getByRole('button', { name: 'On sale' }))
    expect(titlesShown()).toEqual(['Imperium Maledictum'])
    await u.click(screen.getByRole('button', { name: 'On sale' }))

    // Rule System counts: two Year Zero titles, one Imperium Maledictum
    const yearZero = screen.getByRole('checkbox', { name: /Year Zero Engine/ })
    expect(
      yearZero.closest('label') ?? yearZero.parentElement,
    ).toHaveTextContent('2')
    await u.click(yearZero)
    expect(titlesShown()).toEqual(['Vaesen', 'Coriolis'])

    await u.click(screen.getByRole('combobox', { name: 'Sort' }))
    await u.click(screen.getByRole('option', { name: 'Title A–Z' }))
    expect(titlesShown()).toEqual(['Coriolis', 'Vaesen'])
  })

  it('adds everything it can to the cart: not owned, not already there', async () => {
    const success = vi.spyOn(toast, 'success')
    const { bodies } = mockWishlist([vaesen, imperium, coriolis, honk], {
      'POST /wishlist/add-to-cart': { body: { cart: {}, skippedOwned: [] } },
    })
    const { user: u } = await renderWishlist()

    await u.click(screen.getByRole('button', { name: 'Add all to cart' }))

    expect(bodies('POST /wishlist/add-to-cart')).toEqual([
      { titleIds: ['ttl_vaesen', 'ttl_imperium'] },
    ])
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        '2 titles added to your cart.',
        expect.anything(),
      ),
    )
  })

  it('adds the sale titles from the banner', async () => {
    const { bodies } = mockWishlist([vaesen, imperium], {
      'POST /wishlist/add-to-cart': { body: { cart: {}, skippedOwned: [] } },
    })
    const { user: u } = await renderWishlist()

    await u.click(
      screen.getByRole('button', { name: 'Add sale titles to cart' }),
    )

    expect(bodies('POST /wishlist/add-to-cart')).toEqual([
      { titleIds: ['ttl_imperium'] },
    ])
  })

  it('takes a title off with the heart, and puts it back with Undo', async () => {
    const success = vi.spyOn(toast, 'success')
    const { bodies } = mockWishlist([vaesen, imperium], {
      'DELETE /wishlist/items/ttl_vaesen': { body: { undoToken: 'undo_1' } },
      'POST /wishlist/undo': { body: vaesen },
    })
    const { user: u } = await renderWishlist()

    await u.click(
      within(results()).getByRole('button', { name: 'Wishlist: Vaesen' }),
    )

    await waitFor(() => expect(success).toHaveBeenCalled())
    const [text, options] = success.mock.calls[0]
    expect(text).toBe('Vaesen is off your wishlist.')
    const action = options?.action as { label: string; onClick: () => void }
    expect(action.label).toBe('Undo')
    action.onClick()
    await waitFor(() =>
      expect(bodies('POST /wishlist/undo')).toEqual([{ undoToken: 'undo_1' }]),
    )
  })

  it('shares the wishlist only once the link is turned on', async () => {
    const shareUrl = 'https://drivethrurpg.example/wishlists/wl_9x2k4m'
    const { bodies } = mockWishlist([vaesen], {
      'GET /wishlist/settings': { body: { isPublic: false, shareUrl: null } },
      'PATCH /wishlist/settings': { body: { isPublic: true, shareUrl } },
    })
    const { user: u } = await renderWishlist()

    await u.click(screen.getByRole('button', { name: 'Share' }))
    const dialog = await screen.findByRole('dialog', {
      name: 'Share your wishlist',
    })
    expect(
      within(dialog).getByText('Only you can see your wishlist.'),
    ).toBeVisible()

    await u.click(
      await within(dialog).findByRole('switch', { name: 'Share with a link' }),
    )
    expect(bodies('PATCH /wishlist/settings')).toEqual([{ isPublic: true }])
    expect(
      await within(dialog).findByRole('textbox', { name: 'Wishlist link' }),
    ).toHaveValue(shareUrl)

    await u.click(within(dialog).getByRole('button', { name: 'Copy link' }))
    // user-event's clipboard stands in for the browser's
    expect(await navigator.clipboard.readText()).toBe(shareUrl)
  })

  it('says when the wishlist is empty, with popular titles to start from', async () => {
    mockWishlist([], {
      'GET /titles': {
        body: {
          items: [
            {
              ...toTitleSummary(vaesen),
              id: 'ttl_eberron',
              title: 'Exploring Eberron',
              inWishlist: false,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 4,
        },
      },
    })
    await renderWithProviders(<Harness />)

    expect(
      await screen.findByRole('heading', { name: 'Your wishlist is empty' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Browse the store' }),
    ).toHaveAttribute('href', '/titles')
    const picks = await screen.findByRole('list', { name: 'Popular picks' })
    expect(
      within(picks).getByRole('link', { name: 'Exploring Eberron' }),
    ).toHaveAttribute('href', '/titles/ttl_eberron')
  })
})

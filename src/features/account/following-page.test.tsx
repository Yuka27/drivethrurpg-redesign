import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { FollowingPage } from './following-page'
import { apiError, mockApi } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const item = (
  id: string,
  name: string,
  titleCount: number,
  followedAt: string,
  emailNewReleases = true,
  logo: { url: string; alt: string } | null = {
    url: `/img/publishers/${id}.svg`,
    alt: '',
  },
) => ({
  publisher: { id, name, logo, titleCount },
  followedAt,
  emailNewReleases,
})

const items = [
  item(
    'pub_free_league',
    'Free League Publishing',
    187,
    '2025-11-01T10:00:00Z',
  ),
  item(
    'pub_cubicle7',
    'Cubicle 7 Entertainment',
    214,
    '2025-11-02T10:00:00Z',
    false,
  ),
  item(
    'pub_lantern_ash',
    'Lantern & Ash Games',
    63,
    '2024-03-04T10:00:00Z',
    true,
    null,
  ),
]

/** /following/feed: 3 new titles from Free League, 1 from Cubicle 7, none from Lantern & Ash */
const usd = (amount: number) => ({ amount, currency: 'USD' })
const released = (id: string, publisherId: string) => ({
  id,
  title: `Title ${id}`,
  publisher: { id: publisherId, name: publisherId },
  price: usd(999),
})
const feed = {
  items: [
    released('ttl_1', 'pub_free_league'),
    released('ttl_2', 'pub_free_league'),
    released('ttl_3', 'pub_free_league'),
    released('ttl_4', 'pub_cubicle7'),
  ],
}

function mockFollowingApi(overrides: Record<string, Handler> = {}) {
  let current = [...items]
  return mockApi({
    'GET /following': () => ({ body: { items: current } }),
    'GET /following/feed': { body: feed },
    'PATCH /following/pub_cubicle7': { body: {} },
    'DELETE /following/pub_free_league': () => {
      current = current.filter((i) => i.publisher.id !== 'pub_free_league')
      return { status: 204 }
    },
    'POST /following': ({ body }) => {
      const restored = items.find(
        (i) => i.publisher.id === (body as { publisherId: string }).publisherId,
      )
      if (restored) current = [...current, restored]
      return { body: { following: true } }
    },
    ...overrides,
  })
}

/** Publisher names in list order (only the followed list, not the breadcrumb) */
const rows = () =>
  within(screen.getByRole('list', { name: 'Following' }))
    .getAllByRole('listitem')
    .map(
      (row) =>
        within(row).queryByText(/Publishing|Entertainment|Games/)?.textContent,
    )

async function renderPage() {
  const result = await renderWithProviders(<FollowingPage />)
  await screen.findByText('Free League Publishing')
  return result
}

describe('FollowingPage', () => {
  it('lists followed publishers, most recently followed first', async () => {
    mockFollowingApi()
    await renderPage()

    expect(rows()).toEqual([
      'Cubicle 7 Entertainment',
      'Free League Publishing',
      'Lantern & Ash Games',
    ])
    expect(screen.getByText('187 titles · followed Nov 2025')).toBeVisible()
    // "N new" counts the publisher's titles in the following feed
    expect(await screen.findByLabelText('3 new titles')).toHaveTextContent(
      '3 new',
    )
    expect(screen.getByLabelText('1 new title')).toHaveTextContent('1 new')
    expect(
      screen.getByRole('switch', {
        name: 'Email me about new releases from Cubicle 7 Entertainment',
      }),
    ).not.toBeChecked()
  })

  it('searches and sorts', async () => {
    mockFollowingApi()
    const { user } = await renderPage()

    await user.click(screen.getByRole('combobox', { name: 'Sort' }))
    await user.click(await screen.findByRole('option', { name: 'Most titles' }))
    expect(rows()).toEqual([
      'Cubicle 7 Entertainment',
      'Free League Publishing',
      'Lantern & Ash Games',
    ])
    await user.click(screen.getByRole('combobox', { name: 'Sort' }))
    await user.click(await screen.findByRole('option', { name: 'Name (A–Z)' }))
    expect(rows()[0]).toBe('Cubicle 7 Entertainment')
    expect(rows()[2]).toBe('Lantern & Ash Games')

    const search = screen.getByRole('searchbox', {
      name: 'Search publishers you follow',
    })
    await user.type(search, 'league')
    expect(rows()).toEqual(['Free League Publishing'])
    await user.clear(search)
    await user.type(search, 'zzz')
    expect(screen.getByText('No publishers match “zzz”.')).toBeVisible()
  })

  it('switches new-release emails per publisher', async () => {
    const { bodies } = mockFollowingApi()
    const { user } = await renderPage()
    const email = screen.getByRole('switch', {
      name: 'Email me about new releases from Cubicle 7 Entertainment',
    })

    await user.click(email)

    expect(email).toBeChecked()
    await waitFor(() =>
      expect(bodies('PATCH /following/pub_cubicle7')).toEqual([
        { emailNewReleases: true },
      ]),
    )
  })

  it('puts the switch back when saving fails', async () => {
    const error = vi.spyOn(toast, 'error')
    mockFollowingApi({
      'PATCH /following/pub_cubicle7': apiError(503, 'unavailable'),
    })
    const { user } = await renderPage()
    const email = screen.getByRole('switch', {
      name: 'Email me about new releases from Cubicle 7 Entertainment',
    })

    await user.click(email)

    await waitFor(() => expect(email).not.toBeChecked())
    expect(error).toHaveBeenCalled()
  })

  it('unfollows at once, and Undo follows again', async () => {
    const success = vi.spyOn(toast, 'success')
    const { bodies } = mockFollowingApi()
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Following Free League Publishing' }),
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Unfollow' }))

    expect(screen.queryByText('Free League Publishing')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        'You unfollowed Free League Publishing.',
        expect.anything(),
      ),
    )
    expect(bodies('DELETE /following/pub_free_league')).toHaveLength(1)

    // the toast's Undo button
    const options = success.mock.calls[0]?.[1] as {
      action: { label: string; onClick: () => void }
    }
    expect(options.action.label).toBe('Undo')
    options.action.onClick()

    expect(await screen.findByText('Free League Publishing')).toBeVisible()
    expect(bodies('POST /following')).toEqual([
      { publisherId: 'pub_free_league' },
    ])
  })

  it('brings the row back when unfollowing fails', async () => {
    const error = vi.spyOn(toast, 'error')
    let loads = 0
    mockFollowingApi({
      'DELETE /following/pub_free_league': apiError(503, 'unavailable'),
      // the refetch after the failure is slow: the row must come back before it
      'GET /following': () =>
        ++loads === 1
          ? { body: { items } }
          : new Promise((resolve) =>
              setTimeout(() => resolve({ body: { items } }), 2000),
            ),
    })
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Following Free League Publishing' }),
    )
    await user.click(await screen.findByRole('menuitem', { name: 'Unfollow' }))

    await waitFor(() => expect(error).toHaveBeenCalled())
    expect(
      await screen.findByText('Free League Publishing', {}, { timeout: 500 }),
    ).toBeVisible()
  })

  it('links to the publisher page from the menu', async () => {
    mockFollowingApi()
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Following Cubicle 7 Entertainment' }),
    )
    expect(
      await screen.findByRole('menuitem', { name: 'View publisher' }),
    ).toHaveAttribute('href', '/titles?publisher=pub_cubicle7')
  })

  it('shows initials when a logo is missing or fails to load', async () => {
    mockFollowingApi()
    const { container } = await renderPage()

    // no logo at all
    expect(screen.getByText('LA')).toBeInTheDocument()
    // a logo that cannot be drawn: first letters of the words, "Cubicle 7 Entertainment" -> "CE"
    const logos = container.querySelectorAll('img')
    fireEvent.error(logos[0])
    expect(await screen.findByText('CE')).toBeInTheDocument()
  })

  it('suggests publishers from the library when nothing is followed', async () => {
    const libraryItem = (id: string, publisherId: string, name: string) => ({
      id,
      title: { id: `ttl_${id}`, name: `Title ${id}` },
      publisher: { id: publisherId, name },
      cover: null,
      type: null,
      ruleSystem: null,
      formats: ['pdf'],
      files: [],
      purchasedAt: '2026-01-01T00:00:00Z',
      lastUpdatedAt: null,
      hasUpdate: false,
      giftFrom: null,
    })
    const { bodies } = mockApi({
      'GET /following': { body: { items: [] } },
      'GET /following/feed': { body: { items: [] } },
      'GET /library': {
        body: {
          items: [
            libraryItem('a', 'pub_free_league', 'Free League Publishing'),
            libraryItem('b', 'pub_free_league', 'Free League Publishing'),
            libraryItem('c', 'pub_cubicle7', 'Cubicle 7 Entertainment'),
          ],
        },
      },
      'POST /following': { status: 201, body: {} },
    })
    const { user } = await renderWithProviders(<FollowingPage />)

    expect(
      await screen.findByRole('heading', {
        name: 'You’re not following any publishers',
      }),
    ).toBeVisible()
    expect(screen.queryByRole('searchbox', { name: /publishers/ })).toBeNull()
    const suggested = await screen.findByRole('list', {
      name: 'Publishers with titles in your library',
    })
    expect(
      within(suggested)
        .getAllByRole('listitem')
        .map((row) => row.textContent),
    ).toEqual([
      expect.stringContaining('2 titles in your library'),
      expect.stringContaining('1 title in your library'),
    ])

    await user.click(
      within(suggested).getByRole('button', {
        name: 'Follow Free League Publishing',
      }),
    )
    expect(bodies('POST /following')).toEqual([
      { publisherId: 'pub_free_league' },
    ])
  })
})

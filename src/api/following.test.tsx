import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import type { FollowKind } from './follow-kind'
import { FollowingListSchema, useFollowing, useToggleFollow } from './following'
import { useGenres } from './genres'
import { apiError, mockApi, never } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

/** GET /following?type=all as the v4.1 mock API sends it (trimmed). */
const followingAll = {
  items: [
    {
      type: 'publisher',
      publisher: {
        id: 'pub_free_league',
        name: 'Free League Publishing',
        logo: { url: '/img/publishers/pub_free_league.png', alt: 'logo' },
        titleCount: 187,
        following: true,
        hasRealLogo: true,
      },
      followedAt: '2025-11-01T10:00:00Z',
      emailNewReleases: true,
      latestTitle: null,
    },
    {
      type: 'imprint',
      target: {
        id: 'imp_miskatonic',
        name: 'Miskatonic Repository',
        publisherId: 'pub_chaosium',
        following: true,
        logo: { url: '/img/publishers/pub_chaosium.png', alt: '' },
      },
      followedAt: '2026-01-12T10:00:00Z',
      emailNewReleases: true,
    },
    {
      type: 'rule_system',
      target: { id: 'year_zero', name: 'Year Zero Engine', following: true },
      followedAt: '2026-02-03T10:00:00Z',
      emailNewReleases: false,
    },
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
  page: 1,
  pageSize: 100,
  total: 5,
  nextCursor: null,
}

describe('FollowingListSchema', () => {
  it('reads every kind into one shape', () => {
    const { items } = FollowingListSchema.parse(followingAll)

    expect(items.map((item) => [item.kind, item.id])).toEqual([
      ['publisher', 'pub_free_league'],
      ['imprint', 'imp_miskatonic'],
      ['rule_system', 'year_zero'],
      ['genre', 'horror'],
      ['product_line', 'pl_vaesen'],
    ])
    expect(items[0]).toEqual({
      kind: 'publisher',
      id: 'pub_free_league',
      name: 'Free League Publishing',
      logo: { url: '/img/publishers/pub_free_league.png', alt: 'logo' },
      titleCount: 187,
      followedAt: '2025-11-01T10:00:00Z',
      emailNewReleases: true,
    })
    // only publishers come with a count
    expect(items[3]).toMatchObject({ name: 'Horror', titleCount: null })
  })

  it('reads a publisher row without a type (plain GET /following)', () => {
    const { items } = FollowingListSchema.parse({
      items: [
        {
          publisher: { id: 'pub_devir', name: 'Devir', titleCount: 340 },
          followedAt: '2025-11-02T10:00:00Z',
          emailNewReleases: false,
        },
      ],
    })
    expect(items[0]?.kind).toBe('publisher')
  })

  it('leaves out a kind it does not know, or a broken row, keeping the rest', () => {
    const { items } = FollowingListSchema.parse({
      items: [
        ...followingAll.items,
        { type: 'author', target: { id: 'a', name: 'A' }, followedAt: 'x' },
        { type: 'genre', target: { id: 'fantasy' } },
      ],
    })
    expect(items).toHaveLength(5)
  })
})

/** The genres and the Following list, and a button to (un)follow one thing. */
function Harness({
  kind,
  id,
  on,
}: {
  kind: FollowKind
  id: string
  on: boolean
}) {
  const genres = useGenres()
  const following = useFollowing()
  const toggle = useToggleFollow()
  return (
    <>
      <output aria-label="genres">
        {genres.data
          ?.map((genre) => `${genre.id}:${genre.following}`)
          .join(',')}
      </output>
      <output aria-label="following">
        {following.data?.map((item) => item.id).join(',')}
      </output>
      <output aria-label="status">{toggle.status}</output>
      <button type="button" onClick={() => toggle.mutate({ kind, id, on })}>
        toggle
      </button>
    </>
  )
}

const genres = {
  items: [
    { id: 'horror', name: 'Horror', following: true, titleCount: 12 },
    { id: 'fantasy', name: 'Fantasy', following: false, titleCount: 14 },
  ],
}

function mockFollowApi(handlers: Record<string, Handler>) {
  return mockApi({
    'GET /genres': { body: genres },
    'GET /following': { body: followingAll },
    ...handlers,
  })
}

const text = (name: string) => screen.getByRole('status', { name }).textContent

async function renderHarness(props: {
  kind: FollowKind
  id: string
  on: boolean
}) {
  const result = await renderWithProviders(<Harness {...props} />)
  await waitFor(() => expect(text('genres')).toBe('horror:true,fantasy:false'))
  await waitFor(() => expect(text('following')).toContain('pl_vaesen'))
  return result
}

describe('useToggleFollow', () => {
  it.each([
    [
      'publisher',
      'pub_free_league',
      'DELETE /publishers/pub_free_league/follow',
    ],
    ['product_line', 'pl_vaesen', 'DELETE /product-lines/pl_vaesen/follow'],
    ['imprint', 'imp_miskatonic', 'DELETE /imprints/imp_miskatonic/follow'],
    ['rule_system', 'year_zero', 'DELETE /rule-systems/year_zero/follow'],
    ['genre', 'horror', 'DELETE /genres/horror/follow'],
  ] as const)('unfollows a %s at %s', async (kind, id, request) => {
    const { bodies } = mockFollowApi({ [request]: never })
    const { user } = await renderHarness({ kind, id, on: false })

    await user.click(screen.getByRole('button', { name: 'toggle' }))

    await waitFor(() => expect(bodies(request)).toHaveLength(1))
    // gone from the Following list before the API answers
    expect(text('following').split(',')).not.toContain(id)
  })

  it('follows a genre at once, before the API answers', async () => {
    const { bodies } = mockFollowApi({ 'POST /genres/fantasy/follow': never })
    const { user } = await renderHarness({
      kind: 'genre',
      id: 'fantasy',
      on: true,
    })

    await user.click(screen.getByRole('button', { name: 'toggle' }))

    expect(text('genres')).toBe('horror:true,fantasy:true')
    expect(bodies('POST /genres/fantasy/follow')).toEqual([{}])
  })

  it('puts everything back when the API refuses', async () => {
    // refetches never answer: only the rollback can bring the state back
    let genreLoads = 0
    let followingLoads = 0
    mockFollowApi({
      'DELETE /genres/horror/follow': apiError(503, 'unavailable'),
      'GET /genres': () => (++genreLoads === 1 ? { body: genres } : never()),
      'GET /following': () =>
        ++followingLoads === 1 ? { body: followingAll } : never(),
    })
    const { user } = await renderHarness({
      kind: 'genre',
      id: 'horror',
      on: false,
    })

    await user.click(screen.getByRole('button', { name: 'toggle' }))

    await waitFor(() => expect(text('status')).toBe('error'))
    expect(text('genres')).toBe('horror:true,fantasy:false')
    expect(text('following').split(',')).toContain('horror')
  })

  it('refetches the follow state once the API has answered', async () => {
    let following = true
    const { params } = mockFollowApi({
      'DELETE /genres/horror/follow': () => {
        following = false
        return { body: { following } }
      },
      'GET /genres': () => ({
        body: {
          items: genres.items.map((genre) =>
            genre.id === 'horror' ? { ...genre, following } : genre,
          ),
        },
      }),
    })
    const { user } = await renderHarness({
      kind: 'genre',
      id: 'horror',
      on: false,
    })
    const loads = params('GET /genres').length

    await user.click(screen.getByRole('button', { name: 'toggle' }))

    await waitFor(() =>
      expect(params('GET /genres').length).toBeGreaterThan(loads),
    )
    expect(text('genres')).toBe('horror:false,fantasy:false')
  })
})

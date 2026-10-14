import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { ApiError, apiFetch, useRequestPrefs } from './client'
import {
  FOLLOW_BODY_KEY,
  FOLLOW_PATH,
  FollowKindSchema,
  lenientArray,
} from './follow-kind'
import type { FollowKind } from './follow-kind'
import type { Genre } from './genres'
import type { Publisher } from './publishers'
import { queryKeys } from './query-keys'
import { TitleSummarySchema } from './titles'
import type { TitleDetail } from './titles'

/** The list is short; ask for all of it in one page instead of paginating. */
const PAGE_SIZE = 100

const LogoSchema = z
  .object({ url: z.string(), alt: z.string().catch('') })
  .nullish()
  .catch(null)

/** GET /following?type=all, a publisher: its card comes along. */
const FollowedPublisherItemSchema = z.object({
  type: z.literal('publisher').optional(),
  publisher: z.object({
    id: z.string(),
    name: z.string(),
    logo: LogoSchema,
    titleCount: z.number().int().catch(0),
  }),
  followedAt: z.string(),
  emailNewReleases: z.boolean().catch(true),
})

/** GET /following?type=all, anything else: a `target` with its name. */
const FollowedTargetItemSchema = z.object({
  type: FollowKindSchema.exclude(['publisher']),
  target: z.object({ id: z.string(), name: z.string(), logo: LogoSchema }),
  followedAt: z.string(),
  emailNewReleases: z.boolean().catch(true),
})

export type Followed = {
  kind: FollowKind
  id: string
  name: string
  logo: { url: string; alt: string } | null
  /** publishers only: the others come without a count */
  titleCount: number | null
  followedAt: string
  emailNewReleases: boolean
}

/** One followed thing, whatever its kind, as the app uses it. */
export const FollowedItemSchema = z
  .union([FollowedPublisherItemSchema, FollowedTargetItemSchema])
  .transform((item): Followed =>
    'publisher' in item
      ? {
          kind: 'publisher',
          id: item.publisher.id,
          name: item.publisher.name,
          logo: item.publisher.logo ?? null,
          titleCount: item.publisher.titleCount,
          followedAt: item.followedAt,
          emailNewReleases: item.emailNewReleases,
        }
      : {
          kind: item.type,
          id: item.target.id,
          name: item.target.name,
          logo: item.target.logo ?? null,
          titleCount: null,
          followedAt: item.followedAt,
          emailNewReleases: item.emailNewReleases,
        },
  )

/** A kind this app does not know yet is left out, not an error. */
export const FollowingListSchema = z.object({
  items: lenientArray(FollowedItemSchema),
})

/**
 * GET /following?type=all: everything the user follows (publishers, series,
 * imprints, rule systems, genres). One cache entry for the Following page and
 * the home feed's reasons.
 */
function useFollowingList(enabled = true) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.following.list(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/following', {
        params: { type: 'all', pageSize: PAGE_SIZE },
        schema: FollowingListSchema,
        prefs,
        signal,
      }).then((page) => page.items),
    enabled,
  })
}

/** The Following page's list. */
export const useFollowing = () => useFollowingList()

/** What the user follows, for the home feed's reasons and chips (signed in only). */
export const useFollowTargets = (enabled: boolean) => useFollowingList(enabled)

const FeedTitleSchema = TitleSummarySchema.extend({
  releaseDate: z.string().nullish(),
})
const FeedSchema = z.object({ items: z.array(FeedTitleSchema) })

/**
 * GET /following/feed: the new releases from everything the user follows,
 * newest first. One query for its one cache entry; the hooks below select
 * what they need from it.
 */
function useFeed<T>(
  select: (feed: z.infer<typeof FeedSchema>) => T,
  enabled = true,
) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.following.feed(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/following/feed', {
        params: { pageSize: PAGE_SIZE },
        schema: FeedSchema,
        prefs,
        signal,
      }),
    select,
    enabled,
  })
}

/** New titles per followed publisher ("3 new"), counted from the feed. */
export const useNewTitleCounts = () =>
  useFeed(({ items }) => {
    const counts = new Map<string, number>()
    for (const { publisher } of items) {
      if (publisher)
        counts.set(publisher.id, (counts.get(publisher.id) ?? 0) + 1)
    }
    return counts
  })

/** The feed's titles (home's "Following" tab), for a signed-in user only. */
export const useFollowingTitles = (enabled: boolean) =>
  useFeed(({ items }) => items, enabled)

/**
 * The feed cannot be shown at all: no such endpoint (404) or an answer of
 * another shape. Anything else (offline, 5xx) is worth a retry.
 */
export const feedUnavailable = (error: unknown) =>
  (error instanceof ApiError && error.status === 404) ||
  error instanceof z.ZodError

const LIST = [...queryKeys.following.all, 'list']

type Target = { kind: FollowKind; id: string }

const same =
  ({ kind, id }: Target) =>
  (item: Followed) =>
    item.kind === kind && item.id === id

/** Change every cached copy of the list (one per request-preferences key) and remember the old ones. */
function useOptimisticList() {
  const queryClient = useQueryClient()
  return {
    update: async (change: (items: Array<Followed>) => Array<Followed>) => {
      await queryClient.cancelQueries({ queryKey: LIST })
      const previous = queryClient.getQueriesData<Array<Followed>>({
        queryKey: LIST,
      })
      queryClient.setQueriesData<Array<Followed>>(
        { queryKey: LIST },
        (items) => items && change(items),
      )
      return { previous }
    },
    restore: (context?: {
      previous: Array<[unknown, Array<Followed> | undefined]>
    }) =>
      context?.previous.forEach(([queryKey, data]) =>
        queryClient.setQueryData(queryKey as Array<unknown>, data),
      ),
  }
}

/** PATCH /following/{id}: "Email me about new releases". The switch moves at once. */
export function useSetFollowEmail() {
  const list = useOptimisticList()
  return useMutation({
    mutationFn: ({ id, email }: Target & { email: boolean }) =>
      apiFetch(`/following/${id}`, {
        method: 'PATCH',
        body: { emailNewReleases: email },
        schema: z.unknown(),
      }),
    onMutate: ({ email, ...target }) =>
      list.update((items) =>
        items.map((item) =>
          same(target)(item) ? { ...item, emailNewReleases: email } : item,
        ),
      ),
    onError: (_error, _vars, context) => list.restore(context),
  })
}

/**
 * Everything that shows a follow state: the Following list and feed, the
 * genres, publishers and title pages. Refetched in the background: returning
 * the promise would hold back the caller's own callbacks (the Undo / error
 * message) until the refetch ends.
 */
function useRefetchFollowState() {
  const queryClient = useQueryClient()
  return () => {
    for (const queryKey of [
      queryKeys.following.all,
      queryKeys.genres.all,
      queryKeys.publishers.all,
      [...queryKeys.titles.all, 'detail'],
    ])
      void queryClient.invalidateQueries({ queryKey })
  }
}

/** DELETE /following/{id}. The row leaves the list at once. */
export function useUnfollow() {
  const list = useOptimisticList()
  const refetch = useRefetchFollowState()
  return useMutation({
    mutationFn: ({ id }: Target) =>
      apiFetch(`/following/${id}`, { method: 'DELETE', schema: z.unknown() }),
    onMutate: (target) =>
      list.update((items) => items.filter((item) => !same(target)(item))),
    onError: (_error, _vars, context) => list.restore(context),
    onSettled: refetch,
  })
}

/** POST /following: follow anything (also "Undo" after unfollowing). */
export function useFollow() {
  const refetch = useRefetchFollowState()
  return useMutation({
    mutationFn: ({ kind, id }: Target) =>
      apiFetch('/following', {
        method: 'POST',
        body: { [FOLLOW_BODY_KEY[kind]]: id },
        schema: z.unknown(),
      }),
    onSettled: refetch,
  })
}

/** A title with one target's follow state changed, wherever the title shows it. */
function withFollow(
  title: TitleDetail,
  { kind, id }: Target,
  on: boolean,
): TitleDetail {
  const ref = <T extends { id: string; following: boolean }>(item: T) =>
    item.id === id ? { ...item, following: on } : item
  return {
    ...title,
    followTargets: title.followTargets.map((target) =>
      target.type === kind ? ref(target) : target,
    ),
    genreRefs: kind === 'genre' ? title.genreRefs.map(ref) : title.genreRefs,
    productLineRef:
      kind === 'product_line' && title.productLineRef
        ? ref(title.productLineRef)
        : title.productLineRef,
  }
}

type CacheEdit = {
  queryKey: ReadonlyArray<unknown>
  edit: (data: never) => unknown
}

/** The cached data a follow change shows in, and how it changes there. */
function followEdits({ kind, id }: Target, on: boolean): Array<CacheEdit> {
  const edits: Array<CacheEdit> = [
    {
      queryKey: [...queryKeys.titles.all, 'detail'],
      edit: (title: TitleDetail) => withFollow(title, { kind, id }, on),
    },
  ]
  if (kind === 'genre')
    edits.push({
      queryKey: queryKeys.genres.all,
      edit: (genres: Array<Genre>) =>
        genres.map((genre) =>
          genre.id === id ? { ...genre, following: on } : genre,
        ),
    })
  if (kind === 'publisher')
    edits.push({
      queryKey: [...queryKeys.publishers.all, 'detail', id],
      edit: (publisher: Publisher) => ({ ...publisher, following: on }),
    })
  // a follow needs its new row from the API; an unfollow can go at once
  if (!on)
    edits.push({
      queryKey: LIST,
      edit: (items: Array<Followed>) =>
        items.filter((item) => !same({ kind, id })(item)),
    })
  return edits
}

/**
 * POST or DELETE /{publishers|product-lines|imprints|rule-systems|genres}/{id}/follow:
 * the weekly new-releases email. Optimistic wherever the state shows (title
 * pages, genres, the publisher, the Following list) and rolled back on an
 * error; then those and the Following feed refetch.
 */
export function useToggleFollow() {
  const queryClient = useQueryClient()
  const refetch = useRefetchFollowState()

  return useMutation({
    mutationFn: ({ kind, id, on }: Target & { on: boolean }) =>
      apiFetch(`${FOLLOW_PATH[kind]}/${id}/follow`, {
        method: on ? 'POST' : 'DELETE',
        body: on ? {} : undefined,
        schema: z.unknown(),
      }),
    onMutate: async ({ on, ...target }) => {
      const previous: Array<[ReadonlyArray<unknown>, unknown]> = []
      for (const { queryKey, edit } of followEdits(target, on)) {
        await queryClient.cancelQueries({ queryKey })
        for (const [key, data] of queryClient.getQueriesData({ queryKey })) {
          if (data === undefined) continue
          previous.push([key, data])
          queryClient.setQueryData(
            key,
            (edit as (data: unknown) => unknown)(data),
          )
        }
      }
      return { previous }
    },
    onError: (_error, _vars, context) =>
      context?.previous.forEach(([key, data]) =>
        queryClient.setQueryData(key, data),
      ),
    onSettled: refetch,
  })
}

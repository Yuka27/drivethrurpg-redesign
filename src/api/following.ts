import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { ApiError, apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'
import { TitleSummarySchema } from './titles'

/** The list is short; ask for all of it in one page instead of paginating. */
const PAGE_SIZE = 100

const FollowedPublisherSchema = z.object({
  publisher: z.object({
    id: z.string(),
    name: z.string(),
    logo: z.object({ url: z.string(), alt: z.string() }).nullish(),
    titleCount: z.number().int(),
  }),
  followedAt: z.string(),
  emailNewReleases: z.boolean(),
})
export type FollowedPublisher = z.infer<typeof FollowedPublisherSchema>

/** GET /following: the publishers the user follows. */
export function useFollowing() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.following.list(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/following', {
        params: { pageSize: PAGE_SIZE },
        schema: z.object({ items: z.array(FollowedPublisherSchema) }),
        prefs,
        signal,
      }).then((page) => page.items),
  })
}

const FeedTitleSchema = TitleSummarySchema.extend({
  releaseDate: z.string().nullish(),
})
export type FeedTitle = z.infer<typeof FeedTitleSchema>
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

const FollowTargetSchema = z.union([
  z.object({
    type: z.literal('publisher').catch('publisher'),
    publisher: z.object({ id: z.string(), name: z.string() }),
  }),
  z.object({
    type: z.string(),
    target: z.object({ id: z.string(), name: z.string() }),
  }),
])
export type FollowTarget = {
  /** "publisher", "imprint", "rule_system" */
  type: string
  id: string
  name: string
}

/** GET /following?type=all: publishers, imprints and rule systems followed. */
export function useFollowTargets(enabled: boolean) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.following.targets(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/following', {
        params: { type: 'all', pageSize: PAGE_SIZE },
        schema: z.object({ items: z.array(FollowTargetSchema) }),
        prefs,
        signal,
      }).then(({ items }): Array<FollowTarget> =>
        items.map((item) =>
          'publisher' in item
            ? { type: 'publisher', ...item.publisher }
            : { type: item.type, ...item.target },
        ),
      ),
    enabled,
  })
}

const LIST = ['following', 'list']

/** Change every cached copy of the list (one per request-preferences key) and remember the old ones. */
function useOptimisticList() {
  const queryClient = useQueryClient()
  return {
    update: async (
      change: (items: Array<FollowedPublisher>) => Array<FollowedPublisher>,
    ) => {
      await queryClient.cancelQueries({ queryKey: LIST })
      const previous = queryClient.getQueriesData<Array<FollowedPublisher>>({
        queryKey: LIST,
      })
      queryClient.setQueriesData<Array<FollowedPublisher>>(
        { queryKey: LIST },
        (items) => items && change(items),
      )
      return { previous }
    },
    restore: (context?: {
      previous: Array<[unknown, Array<FollowedPublisher> | undefined]>
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
    mutationFn: ({ id, email }: { id: string; email: boolean }) =>
      apiFetch(`/following/${id}`, {
        method: 'PATCH',
        body: { emailNewReleases: email },
        schema: z.unknown(),
      }),
    onMutate: ({ id, email }) =>
      list.update((items) =>
        items.map((item) =>
          item.publisher.id === id
            ? { ...item, emailNewReleases: email }
            : item,
        ),
      ),
    onError: (_error, _vars, context) => list.restore(context),
  })
}

/** DELETE /following/{id}. The row leaves the list at once. */
export function useUnfollow() {
  const queryClient = useQueryClient()
  const list = useOptimisticList()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/following/${id}`, { method: 'DELETE', schema: z.unknown() }),
    onMutate: (id) =>
      list.update((items) => items.filter((item) => item.publisher.id !== id)),
    onError: (_error, _id, context) => list.restore(context),
    // refresh in the background: returning the promise would hold back the
    // caller's own callbacks (the Undo / error message) until the refetch ends
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.following.all })
    },
  })
}

/** POST /following: follow a publisher (also "Undo" after unfollowing). */
export function useFollow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (publisherId: string) =>
      apiFetch('/following', {
        method: 'POST',
        body: { publisherId },
        schema: z.unknown(),
      }),
    // refresh in the background: returning the promise would hold back the
    // caller's own callbacks (the Undo / error message) until the refetch ends
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.following.all })
    },
  })
}

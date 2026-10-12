import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

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

/**
 * New titles per followed publisher ("3 new"), counted from GET /following/feed:
 * the new releases from the publishers the user follows.
 */
export function useNewTitleCounts() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.following.feed(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/following/feed', {
        params: { pageSize: PAGE_SIZE },
        schema: z.object({
          items: z.array(z.object({ publisher: z.object({ id: z.string() }) })),
        }),
        prefs,
        signal,
      }),
    select: ({ items }) => {
      const counts = new Map<string, number>()
      for (const { publisher } of items) {
        counts.set(publisher.id, (counts.get(publisher.id) ?? 0) + 1)
      }
      return counts
    },
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

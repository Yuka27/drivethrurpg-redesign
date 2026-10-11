import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

const PublisherSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z
    .object({ url: z.string(), alt: z.string().catch('') })
    .nullable()
    .catch(null),
  titleCount: z.number().int().catch(0),
  /** whether the current user follows it (false for guests) */
  following: z.boolean().catch(false),
})
export type Publisher = z.infer<typeof PublisherSchema>

/** GET /publishers/{id}. */
export function usePublisher(publisherId: string | undefined) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.publishers.detail(publisherId ?? '', prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/publishers/${publisherId}`, {
        schema: PublisherSchema,
        prefs,
        signal,
      }),
    enabled: publisherId !== undefined,
  })
}

/**
 * POST or DELETE /publishers/{id}/follow (the weekly new-releases email).
 * Optimistic on the publisher; the Following page refetches.
 */
export function useTogglePublisherFollow() {
  const queryClient = useQueryClient()
  const prefs = useRequestPrefs()

  return useMutation({
    mutationFn: ({ publisherId, on }: { publisherId: string; on: boolean }) =>
      apiFetch(`/publishers/${publisherId}/follow`, {
        method: on ? 'POST' : 'DELETE',
        body: on ? {} : undefined,
        schema: z.unknown(),
      }),
    onMutate: async ({ publisherId, on }) => {
      const key = queryKeys.publishers.detail(publisherId, prefs)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Publisher>(key)
      queryClient.setQueryData<Publisher>(
        key,
        (publisher) => publisher && { ...publisher, following: on },
      )
      return { key, previous }
    },
    onError: (_error, _variables, context) => {
      if (context?.previous)
        queryClient.setQueryData(context.key, context.previous)
    },
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.following.all }),
  })
}

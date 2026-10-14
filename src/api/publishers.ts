import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

export const PublisherSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z
    .object({ url: z.string(), alt: z.string().catch('') })
    .nullable()
    .catch(null),
  /** false: `logo` is a generated stand-in, not the publisher's own image */
  hasRealLogo: z.boolean().optional().catch(undefined),
  titleCount: z.number().int().catch(0),
  /** whether the current user follows it (false for guests) */
  following: z.boolean().catch(false),
})
export type Publisher = z.infer<typeof PublisherSchema>

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

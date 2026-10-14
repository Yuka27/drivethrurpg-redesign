import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { lenientArray } from './follow-kind'
import { queryKeys } from './query-keys'

const GenreSchema = z.object({
  /** the listing's `?genre=` value */
  id: z.string(),
  name: z.string(),
  /** whether the current user follows it */
  following: z.boolean().catch(false),
  titleCount: z.number().int().catch(0),
})
export type Genre = z.infer<typeof GenreSchema>

/** GET /genres: every genre with titles, and whether the user follows it. */
export function useGenres(enabled = true) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.genres.list(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/genres', {
        schema: z.object({ items: lenientArray(GenreSchema) }),
        prefs,
        signal,
      }).then((page) => page.items),
    enabled,
  })
}

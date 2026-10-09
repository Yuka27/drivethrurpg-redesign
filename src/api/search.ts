import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { MoneySchema, apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

const TitleCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.object({ id: z.string(), name: z.string() }),
  cover: z.object({ url: z.string(), alt: z.string() }),
  price: MoneySchema,
  aiGenerated: z.boolean(),
})

export const SuggestionsSchema = z.object({
  titles: z.array(TitleCardSchema),
  publishers: z.array(
    z.object({ id: z.string(), name: z.string(), logo: z.unknown() }),
  ),
  queries: z.array(z.string()),
})
export type Suggestions = z.infer<typeof SuggestionsSchema>

export const MIN_SUGGEST_LENGTH = 2

/**
 * GET /search/suggest?q=. Pass the already-debounced query; nothing is fetched
 * below MIN_SUGGEST_LENGTH characters.
 */
export function useSearchSuggestions(query: string) {
  const prefs = useRequestPrefs()
  const q = query.trim()
  return useQuery({
    queryKey: queryKeys.search.suggest(q, prefs),
    queryFn: ({ signal }) =>
      apiFetch('/search/suggest', {
        schema: SuggestionsSchema,
        params: { q },
        prefs,
        signal,
      }),
    enabled: q.length >= MIN_SUGGEST_LENGTH,
    // keep the previous list while the next keystroke loads
    placeholderData: keepPreviousData,
  })
}

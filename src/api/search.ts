import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { MoneySchema, apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'
import { TitleListSchema, compact } from './titles'
import type { TitleFilters, TitleSort } from './titles'

const SuggestedTitleSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.object({ id: z.string(), name: z.string() }),
  cover: z.object({ url: z.string(), alt: z.string() }).nullable().catch(null),
  formats: z.array(z.string()).catch([]),
  price: MoneySchema,
  /** above `price` while on sale */
  listPrice: MoneySchema.nullable().catch(null),
  aiGenerated: z.boolean().catch(false),
})

export const SuggestionsSchema = z.object({
  titles: z.array(SuggestedTitleSchema),
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

/** GET /search: one page of the catalogue for a query, and a spelling fix when nothing matches. */
const SearchResultsSchema = TitleListSchema.extend({
  didYouMean: z.string().nullish(),
})

/**
 * GET /search?q= with the listing's filters, sort and paging: the search
 * results page is the listing over these.
 */
export function useSearchResults(
  filters: TitleFilters,
  {
    sort,
    page,
    pageSize,
    enabled = true,
  }: { sort?: TitleSort; page: number; pageSize: number; enabled?: boolean },
) {
  const prefs = useRequestPrefs()
  const params = { ...compact(filters), sort, page, pageSize }
  return useQuery({
    queryKey: queryKeys.search.results(params, prefs),
    enabled,
    queryFn: ({ signal }) =>
      apiFetch('/search', {
        schema: SearchResultsSchema,
        params,
        prefs,
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

/** GET /search/popular: what people search for (chips in the panel and on "no results"). */
export function usePopularSearches() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.search.popular(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/search/popular', {
        schema: z.object({ terms: z.array(z.string()).catch([]) }),
        prefs,
        signal,
      }).then((popular) => popular.terms),
    staleTime: 60 * 60 * 1000,
  })
}

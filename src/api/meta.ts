import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

export const LocalesSchema = z.object({
  currencies: z.array(
    z.object({ code: z.string(), symbol: z.string(), label: z.string() }),
  ),
  languages: z.array(
    z.object({ code: z.string(), label: z.string(), short: z.string() }),
  ),
  defaults: z.object({
    currency: z.string(),
    language: z.string(),
    showAiGenerated: z.boolean(),
    theme: z.enum(['dark', 'light', 'system']),
  }),
})

/** GET /meta/locales: currency and language lists. They never change during a session. */
export function useLocales() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.meta.locales(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/meta/locales', { schema: LocalesSchema, prefs, signal }),
    staleTime: Infinity,
    // a preference change creates a new key; keep the lists on screen while it loads
    placeholderData: keepPreviousData,
  })
}

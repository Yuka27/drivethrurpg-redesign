import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { ApiError, MoneySchema, apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

export const MeSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatar: z.object({ url: z.string(), alt: z.string() }),
  memberSince: z.string(),
  balance: MoneySchema,
  counts: z.object({
    library: z.number(),
    wishlist: z.number(),
    cart: z.number(),
    unreadNotifications: z.number(),
  }),
})
export type Me = z.infer<typeof MeSchema>

/**
 * GET /me. A 401 means "guest" and resolves to null instead of an error,
 * so `data === null` is logged out and `data` is the user otherwise.
 */
export function useMe() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.me.current(prefs),
    queryFn: async ({ signal }): Promise<Me | null> => {
      try {
        return await apiFetch('/me', { schema: MeSchema, prefs, signal })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    // balance is in the chosen currency, so a currency change refetches; keep the
    // user on screen meanwhile instead of flashing the logged-out header
    placeholderData: keepPreviousData,
  })
}

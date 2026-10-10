import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

/** Only what the shell needs so far; the cart page will extend this. */
const CartSchema = z.object({
  id: z.string(),
  lines: z.array(z.object({ lineId: z.string(), qty: z.number().int() })),
})
export type Cart = z.infer<typeof CartSchema>

/** GET /cart: the guest cart, or the account's cart once logged in. */
export function useCart() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.cart(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/cart', { schema: CartSchema, prefs, signal }),
  })
}

export const cartItemCount = (cart: Cart | undefined) =>
  cart?.lines.reduce((count, line) => count + line.qty, 0) ?? 0

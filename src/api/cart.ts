import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, MoneySchema, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'
import { TitleSummarySchema } from './titles'

const CartLineSchema = z.object({
  lineId: z.string(),
  title: z.object({
    id: z.string(),
    name: z.string(),
    cover: z
      .object({ url: z.string(), alt: z.string() })
      .nullable()
      .catch(null),
  }),
  sku: z.string(),
  formatLabel: z.string().catch(''),
  qty: z.number().int(),
  unitPrice: MoneySchema,
  /** above `unitPrice` while the title is on sale */
  listPrice: MoneySchema.nullable().catch(null),
  /** printed: ships to the buyer; false: a download */
  requiresShipping: z.boolean().catch(false),
  alreadyOwned: z.boolean().catch(false),
})
export type CartLine = z.infer<typeof CartLineSchema>

export const CartSchema = z.object({
  id: z.string(),
  lines: z.array(CartLineSchema),
  /** set aside from the cart; each can move back */
  savedForLater: z.array(CartLineSchema).catch([]),
  promo: z
    .object({
      code: z.string(),
      percentOff: z.number().catch(0),
      discount: MoneySchema,
    })
    .nullable()
    .catch(null),
  gift: z
    .object({
      enabled: z.boolean().catch(false),
      recipientEmail: z.string().optional().catch(undefined),
      /** not in the API yet: kept if it ever comes back */
      recipientName: z.string().optional().catch(undefined),
      message: z.string().optional().catch(undefined),
    })
    .catch({ enabled: false }),
  totals: z.object({
    subtotal: MoneySchema,
    saleSavings: MoneySchema,
    promoDiscount: MoneySchema,
    total: MoneySchema,
    taxAndShippingNote: z.string().catch(''),
  }),
  /** after a removal: POST /cart/undo takes it to bring the line back */
  undoToken: z.string().optional().catch(undefined),
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

/** GET /cart/recommendations: "Customers also bought", for what is in the cart. */
export function useCartRecommendations() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.cartRecommendations(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/cart/recommendations', {
        schema: z.array(TitleSummarySchema).catch([]),
        prefs,
        signal,
      }),
  })
}

/**
 * Every cart change answers with the whole cart: it replaces the cached one,
 * and GET /me is refetched for the header's cart badge.
 */
function useCartMutation<V>(request: (variables: V) => Promise<Cart>) {
  const queryClient = useQueryClient()
  const prefs = useRequestPrefs()
  return useMutation({
    mutationFn: request,
    onSuccess: (cart) => queryClient.setQueryData(queryKeys.cart(prefs), cart),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
      void queryClient.invalidateQueries({
        queryKey: ['cart', 'recommendations'],
      })
    },
  })
}

/** PATCH /cart/items/{lineId}: a new quantity. */
export const useSetLineQty = () =>
  useCartMutation(({ lineId, qty }: { lineId: string; qty: number }) =>
    apiFetch(`/cart/items/${lineId}`, {
      method: 'PATCH',
      body: { qty },
      schema: CartSchema,
    }),
  )

/** POST /cart/items/{lineId}/save-for-later: the line moves to `savedForLater`. */
export const useSaveForLater = () =>
  useCartMutation((lineId: string) =>
    apiFetch(`/cart/items/${lineId}/save-for-later`, {
      method: 'POST',
      body: {},
      schema: CartSchema,
    }),
  )

/** POST /cart/saved/{lineId}/move-to-cart: a saved line back in the cart. */
export function useMoveSavedToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lineId: string) =>
      apiFetch(`/cart/saved/${lineId}/move-to-cart`, {
        method: 'POST',
        body: {},
        schema: z.unknown(),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
  })
}

/** DELETE /cart/items/{lineId}: the cart without it, with an `undoToken`. */
export const useRemoveLine = () =>
  useCartMutation((lineId: string) =>
    apiFetch(`/cart/items/${lineId}`, { method: 'DELETE', schema: CartSchema }),
  )

/** POST /cart/undo: brings the last removed line back. */
export const useUndoRemove = () =>
  useCartMutation((undoToken: string) =>
    apiFetch('/cart/undo', {
      method: 'POST',
      body: { undoToken },
      schema: CartSchema,
    }),
  )

/** POST /cart/promo: applies a code (errors: promo_expired, promo_invalid…). */
export const useApplyPromo = () =>
  useCartMutation((code: string) =>
    apiFetch('/cart/promo', {
      method: 'POST',
      body: { code },
      schema: CartSchema,
    }),
  )

/** DELETE /cart/promo (204): the cart is fetched again after it. */
export const useRemovePromo = () =>
  useCartMutation(async () => {
    await apiFetch('/cart/promo', { method: 'DELETE', schema: z.unknown() })
    return apiFetch('/cart', { schema: CartSchema })
  })

export type GiftDetails = {
  enabled: boolean
  recipientEmail?: string
  recipientName?: string
  message?: string
}

/**
 * PUT /cart/gift: on or off, and who it is for. The API keeps the email and
 * the message; the name is sent for when it keeps that too.
 */
export const useUpdateGift = () =>
  useCartMutation((gift: GiftDetails) =>
    apiFetch('/cart/gift', { method: 'PUT', body: gift, schema: CartSchema }),
  )

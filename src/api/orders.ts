import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { MoneySchema, apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

/** Order history is short; ask for all of it so filters and paging stay in the browser. */
const PAGE_SIZE = 100

const OrderSummarySchema = z.object({
  id: z.string(),
  /** "DT-48612903", what the user sees and can search for */
  number: z.string(),
  placedAt: z.string(),
  /** "paid", "shipped"… */
  status: z.string(),
  total: MoneySchema,
  itemCount: z.number().int(),
})
export type OrderSummary = z.infer<typeof OrderSummarySchema>

/**
 * GET /orders. It has no date or status filter, so the page filters and pages
 * the whole history itself.
 */
export function useOrders() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.orders.list(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/orders', {
        params: { pageSize: PAGE_SIZE },
        schema: z.object({ items: z.array(OrderSummarySchema) }),
        prefs,
        signal,
      }).then((page) => page.items),
  })
}

const OrderLineSchema = z.object({
  lineId: z.string(),
  title: z.object({
    id: z.string(),
    /** the order carries it; older code reads the title's own name instead */
    name: z.string().nullish(),
    cover: z.object({ url: z.string(), alt: z.string() }).nullish(),
  }),
  formatLabel: z.string().nullish(),
  qty: z.number().int(),
  unitPrice: MoneySchema,
  /** printed: ships (the API does not always say) */
  requiresShipping: z.boolean().nullish().catch(null),
})
export type OrderLine = z.infer<typeof OrderLineSchema>

const AddressSchema = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().nullish(),
  city: z.string(),
  postalCode: z.string(),
  country: z.string(),
})

const OrderDetailSchema = OrderSummarySchema.omit({
  total: true,
  itemCount: true,
}).extend({
  lines: z.array(OrderLineSchema),
  totals: z.object({
    subtotal: z.number().int(),
    /** discounts and sale prices together */
    savings: z.number().int(),
    shipping: z.number().int(),
    tax: z.number().int(),
    total: z.number().int(),
    currency: z.string(),
  }),
  /** VAT already inside the prices (EU), in minor units */
  vatIncluded: z.number().int().nullish(),
  payment: z.object({ brand: z.string(), last4: z.string() }).nullish(),
  /** physical items only */
  shippingAddress: AddressSchema.nullish(),
  shippingRate: z
    .object({ label: z.string(), eta: z.string().nullish() })
    .nullish(),
  /** the digital files are in the library */
  digitalReady: z.boolean(),
  /** placed without an account: it can become one (POST …/create-account) */
  guest: z.boolean().catch(false),
})
export type OrderDetail = z.infer<typeof OrderDetailSchema>

/**
 * GET /orders/{id} (by id or by number, DT-48612903): lines, totals, payment,
 * shipping. The order cards and the order page use it.
 * TODO(api): the order list should carry these (and each line's title name and
 * publisher), so a page of orders is one request instead of one per order and
 * one per line.
 */
export function useOrder(id: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.orders.detail(id, prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/orders/${id}`, { schema: OrderDetailSchema, prefs, signal }),
    // a placed order does not change
    staleTime: Infinity,
  })
}

/** POST /orders/{id}/resend-email (202): sends the receipt to the account's email again. */
export function useResendReceipt() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/orders/${id}/resend-email`, {
        method: 'POST',
        schema: z.unknown(),
      }),
  })
}

/**
 * POST /orders/{id}/create-account: a guest keeps the order's titles in a
 * library by choosing a password for the order's email.
 */
export function useCreateAccountFromOrder() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiFetch(`/orders/${id}/create-account`, {
        method: 'POST',
        body: { password },
        schema: z.unknown(),
      }),
  })
}

/** GET /orders/{id}/receipt: where the invoice PDF is. */
export function useReceipt() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/orders/${id}/receipt`, {
        schema: z.object({ pdfUrl: z.string() }),
      }),
  })
}

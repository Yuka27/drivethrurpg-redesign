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
    cover: z.object({ url: z.string(), alt: z.string() }).nullish(),
  }),
  formatLabel: z.string().nullish(),
  qty: z.number().int(),
  unitPrice: MoneySchema,
})
export type OrderLine = z.infer<typeof OrderLineSchema>

const OrderDetailSchema = z.object({
  id: z.string(),
  lines: z.array(OrderLineSchema),
  payment: z.object({ brand: z.string(), last4: z.string() }).nullish(),
})
export type OrderDetail = z.infer<typeof OrderDetailSchema>

/**
 * GET /orders/{id}: the lines and the payment card of one order card.
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

const TitleSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.object({ id: z.string(), name: z.string() }),
})

/** GET /titles/{id}, only its name and publisher (for an order line). */
export function useTitleSummary(id: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.summary(id, prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${id}`, { schema: TitleSummarySchema, prefs, signal }),
    staleTime: 60 * 60 * 1000,
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

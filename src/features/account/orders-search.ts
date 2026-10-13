import { z } from 'zod'

import { createSearchMemory, searchText } from '@/lib/search-params'

export const PERIODS = ['month', 'quarter', 'year', 'all'] as const
export type Period = (typeof PERIODS)[number]

/** What the order list opens on. Figma: "Last month". Defaults stay out of the URL. */
export const ORDERS_SEARCH_DEFAULTS = {
  period: 'month' as Period,
  status: 'all',
  q: '',
  page: 1,
}

/**
 * /orders?period=all&status=shipped&q=486&page=2 — the list's filters live in
 * the URL, so the browser's Back button, a reload or a shared link brings the
 * same list back. Anything invalid falls back to its default.
 */
export const OrdersSearchSchema = z.object({
  period: z.enum(PERIODS).default('month').catch('month'),
  status: searchText(z.string().min(1)).default('all').catch('all'),
  q: searchText(z.string()).default('').catch(''),
  page: z.number().int().min(1).default(1).catch(1),
})
export type OrdersSearch = z.infer<typeof OrdersSearchSchema>

/** The list the user last looked at, for "← Orders" and the sidebar/hub links. */
export const useLastOrdersSearch = createSearchMemory<OrdersSearch>(
  ORDERS_SEARCH_DEFAULTS,
)

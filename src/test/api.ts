import { vi } from 'vite-plus/test'

import type { Me } from '@/api/me'

export type Reply = { status?: number; body?: unknown }
/** What one "METHOD /path" answers: a reply, or a function returning one (sync or async) */
export type Handler =
  | Reply
  | ((request: {
      body: unknown
      params: URLSearchParams
    }) => Reply | Promise<Reply>)
/** `"POST /auth/login"` → its handler */
export type Handlers = Partial<Record<string, Handler>>
type FetchArgs = Parameters<typeof fetch>

/** "POST /auth/login" for a call to {API}/api/v1/auth/login */
function requestKey([input, init]: FetchArgs) {
  const url = new URL(input instanceof Request ? input.url : input)
  return `${init?.method ?? 'GET'} ${url.pathname.replace(/^\/api\/v1/, '')}`
}

const requestParams = ([input]: FetchArgs) =>
  new URL(input instanceof Request ? input.url : input).searchParams

const requestBody = ([, init]: FetchArgs): unknown =>
  typeof init?.body === 'string' ? JSON.parse(init.body) : undefined

/**
 * Replaces `fetch` with a fake API. Keys are "METHOD /path" (after /api/v1).
 * GET /cart answers an empty cart unless a handler says otherwise; anything
 * else unhandled fails the test with a clear message.
 */
export function mockApi(handlers: Handlers = {}) {
  const all: Handlers = {
    'GET /cart': { body: cart(0) },
    ...handlers,
  }
  const fetchMock = vi.fn<typeof fetch>(async (...args) => {
    const key = requestKey(args)
    const handler = all[key]
    if (!handler) throw new Error(`mockApi: no handler for ${key}`)
    const reply =
      typeof handler === 'function'
        ? await handler({
            body: requestBody(args),
            params: requestParams(args),
          })
        : handler
    return new Response(
      reply.body === undefined ? null : JSON.stringify(reply.body),
      { status: reply.status ?? 200 },
    )
  })
  vi.stubGlobal('fetch', fetchMock)

  /** request bodies sent to "METHOD /path", in order */
  const bodies = (key: string) =>
    fetchMock.mock.calls
      .filter((args) => requestKey(args) === key)
      .map(requestBody)
  /** query parameters sent to "METHOD /path", in order */
  const params = (key: string) =>
    fetchMock.mock.calls
      .filter((args) => requestKey(args) === key)
      .map(requestParams)
  return { fetchMock, bodies, params }
}

/** The API's error body: { error: { code, message, field?, retryAfter? } } */
export const apiError = (
  status: number,
  code: string,
  extra: { field?: string; retryAfter?: number } = {},
): Reply => ({ status, body: { error: { code, message: code, ...extra } } })

const usd = (amount: number) => ({ amount, currency: 'USD' })

/** A GET /cart body: `items` copies of one PDF (none for 0). */
export const cart = (items: number) => ({
  id: 'cart_test',
  lines:
    items > 0
      ? [
          {
            lineId: 'line_1',
            title: { id: 'ttl_test', name: 'Test Title', cover: null },
            sku: 'sku_test_pdf',
            formatLabel: 'PDF',
            qty: items,
            unitPrice: usd(1000),
            listPrice: usd(1000),
            requiresShipping: false,
            alreadyOwned: false,
          },
        ]
      : [],
  promo: null,
  gift: { enabled: false },
  totals: {
    subtotal: usd(1000 * items),
    saleSavings: usd(0),
    promoDiscount: usd(0),
    total: usd(1000 * items),
    taxAndShippingNote: 'Calculated at checkout',
  },
})

export const user: Me = {
  id: 'usr_test',
  displayName: 'Test User',
  email: 'test@example.com',
  avatar: { url: '/img/avatar.png', alt: '' },
  memberSince: '2026-01-01',
  balance: { amount: 0, currency: 'USD' },
  counts: { library: 0, wishlist: 0, cart: 0, unreadNotifications: 0 },
}

export const session = { user, token: 'token_test' }

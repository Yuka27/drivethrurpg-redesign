import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { act, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { queryClient } from '@/lib/query-client'
import { createAppRouter } from '@/router'
import { cart, mockApi, user } from '@/test/api'
import type { Handler, Handlers } from '@/test/api'

const locales = {
  currencies: [{ code: 'USD', symbol: '$', label: 'US dollar' }],
  languages: [{ code: 'en', short: 'ENG', label: 'English' }],
  defaults: {
    currency: 'USD',
    language: 'en',
    showAiGenerated: false,
    theme: 'dark',
  },
}

const preferences = {
  email: {},
  downloads: {},
  content: {
    showAdult: false,
    showAiGenerated: false,
    language: 'en',
    currency: 'USD',
  },
  display: { theme: 'dark' },
}

/**
 * mockApi with what every page asks for (the header, the footer, the
 * preferences sync), so a test fakes only its page. `me`: the account, or a
 * guest with apiError(401, 'unauthorized').
 */
export function mockApp(handlers: Handlers = {}, me: Handler = { body: user }) {
  return mockApi({
    'GET /me': me,
    'GET /cart': { body: cart(0) },
    'GET /meta/locales': { body: locales },
    'GET /account/preferences': { body: preferences },
    'GET /titles/facets': {
      body: { formats: [], types: [], ruleSystems: [], publishers: [] },
    },
    'GET /search/popular': { body: { terms: [], titles: [] } },
    ...handlers,
  })
}

/**
 * The whole app (real route tree, layouts, header and footer) opened at `url`,
 * for tests of routing itself. It shares the app's query client, as the
 * routes' login check does; that client is emptied and its retries switched
 * off here. Fake every request the page makes with mockApi first.
 */
export async function renderApp(
  url: string,
  /** false: render at once, without waiting for the routes to get ready */
  { wait = true }: { wait?: boolean } = {},
) {
  queryClient.clear()
  queryClient.setDefaultOptions({
    queries: { retry: false, staleTime: 30_000 },
    mutations: { retry: false },
  })
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
  })
  const events = userEvent.setup()
  if (wait) await act(() => router.load())
  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...result, router, user: events }
}

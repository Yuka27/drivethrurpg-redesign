import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import type { AnyRouter } from '@tanstack/react-router'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'

import { Dialog } from '@/components/ui/dialog'
import { TooltipProvider } from '@/components/ui/tooltip'

/**
 * Renders `ui` the way the app does: a fresh React Query cache (no retries) and
 * a memory router, so <Link> works without the real route tree. i18n is set up
 * once in src/test/setup.ts.
 */
export async function renderWithProviders(
  ui: ReactNode,
  {
    user = userEvent.setup(),
  }: { user?: ReturnType<typeof userEvent.setup> } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  // as the root route does: tooltips need their provider
  const rootRoute = createRootRoute({
    component: () => <TooltipProvider>{ui}</TooltipProvider>,
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()

  const result = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router as unknown as AnyRouter} />
    </QueryClientProvider>,
  )
  return { ...result, user, queryClient, router }
}

/**
 * For the auth views, which live only in the auth modal and use DialogTitle /
 * DialogDescription: Radix needs a Dialog around those. The bare root is
 * enough (no overlay, portal or focus trap to get in the way of queries).
 */
export function renderInDialog(
  ui: ReactNode,
  options?: Parameters<typeof renderWithProviders>[1],
) {
  return renderWithProviders(<Dialog open>{ui}</Dialog>, options)
}

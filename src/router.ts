import { createRouter, defaultStringifySearch } from '@tanstack/react-router'
import type { RouterHistory } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'
import { PageSkeleton } from './components/site/page-skeleton'

/**
 * The app's router. `history` is for tests (a memory history); the app uses
 * the browser's.
 */
export function createAppRouter({ history }: { history?: RouterHistory } = {}) {
  return createRouter({
    routeTree,
    history,
    // multi-select filters are comma lists (?system=osr,d20_5e): keep the
    // commas readable instead of %2C (they are valid in a query string)
    stringifySearch: (search) =>
      defaultStringifySearch(search).replaceAll('%2C', ','),
    defaultPreload: 'intent',
    // a route still getting ready (a page's code arriving) shows an outline
    defaultPendingComponent: PageSkeleton,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

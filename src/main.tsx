import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createRouter,
  defaultStringifySearch,
} from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { queryClient } from './lib/query-client'
import { initI18n } from './i18n'
import { detectInitialLanguage } from './i18n/detect'
import './stores/theme'

import './styles/index.css'

const router = createRouter({
  routeTree,
  // multi-select filters are comma lists (?system=osr,d20_5e): keep the
  // commas readable instead of %2C (they are valid in a query string)
  stringifySearch: (search) =>
    defaultStringifySearch(search).replaceAll('%2C', ','),
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// load the UI text for the detected language before the first render
await initI18n(detectInitialLanguage())

ReactDOM.createRoot(document.getElementById('app')!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
)

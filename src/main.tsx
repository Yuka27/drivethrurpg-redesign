import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { createAppRouter } from './router'
import { queryClient } from './lib/query-client'
import { initI18n } from './i18n'
import { detectInitialLanguage } from './i18n/detect'
import './stores/theme'

import './styles/index.css'

const router = createAppRouter()

// load the UI text for the detected language before the first render
await initI18n(detectInitialLanguage())

ReactDOM.createRoot(document.getElementById('app')!).render(
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>,
)

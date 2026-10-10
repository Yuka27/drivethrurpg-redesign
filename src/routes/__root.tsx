import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'

import { usePreferencesSync } from '@/api/preferences'
import { LoginDialog } from '@/components/auth/login-dialog'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">{t('pages.notFound.title')}</h1>
      <p className="mt-4">{t('pages.notFound.body')}</p>
      <Link to="/" className="mt-4 inline-block underline">
        {t('actions.backHome')}
      </Link>
    </main>
  )
}

function RootError({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslation()
  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold">{t('pages.error.title')}</h1>
      <p className="mt-4">
        {error instanceof Error ? error.message : t('pages.error.unexpected')}
      </p>
      <button type="button" onClick={reset} className="mt-4 underline">
        {t('actions.tryAgain')}
      </button>
    </main>
  )
}

function RootComponent() {
  const { t } = useTranslation()
  usePreferencesSync()

  return (
    <TooltipProvider delayDuration={300}>
      <Outlet />
      <LoginDialog />
      <Toaster containerAriaLabel={t('toasts.region')} />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
          {
            name: 'TanStack Query',
            render: <ReactQueryDevtoolsPanel />,
          },
        ]}
      />
    </TooltipProvider>
  )
}

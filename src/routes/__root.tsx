import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { useAuthSync } from '@/api/auth'
import { usePreferencesSync } from '@/api/preferences'
import { AuthDialog } from '@/features/auth/auth-dialog'
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
  useAuthSync()

  return (
    <TooltipProvider delayDuration={300}>
      <Outlet />
      <AuthDialog />
      <Toaster containerAriaLabel={t('toasts.region')} />
    </TooltipProvider>
  )
}

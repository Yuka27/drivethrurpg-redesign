import {
  Link,
  Outlet,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { useAuthSync } from '@/api/auth'
import { usePreferencesSync } from '@/api/preferences'
import { ErrorState } from '@/components/site/empty-state'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteHeader } from '@/components/site/site-header'
import { Button } from '@/components/ui/button'
import { SUPPORT_URL } from '@/config/links'
import { AuthDialog } from '@/features/auth/auth-dialog'
import { Toaster } from '@/components/ui/sonner'
import { PortfolioNotice } from '@/features/portfolio-notice/portfolio-notice'
import { TooltipProvider } from '@/components/ui/tooltip'

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RootError,
  notFoundComponent: NotFound,
})

/** A d20: a 404 is a critical miss. */
function D20Icon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-16"
    >
      <path d="M12 2 3 7v10l9 5 9-5V7z" />
      <path d="M12 2v6M3 7l9 6 9-6M12 13v9M3 17l9-4 9 4M12 8 7.5 15h9z" />
    </svg>
  )
}

const chipClass =
  'rounded-full border bg-card px-3.5 py-[7px] text-[13px] hover:bg-secondary'

/**
 * 404: a light RPG joke where nothing is at stake, and still the way
 * home, the store and the usual places. Inside the site's header and footer.
 */
function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="container flex flex-1 flex-col items-center py-12 text-center">
        <span className="text-primary">
          <D20Icon />
        </span>
        <p
          aria-hidden
          className="mt-0.5 mb-1.5 font-heading text-[54px] leading-none font-extrabold tracking-tight"
        >
          {t('emptyStates.notFound.code')}
        </p>
        <h1 className="mb-1.5 font-heading text-xl font-bold">
          {t('emptyStates.notFound.title')}
        </h1>
        <p className="mb-[18px] max-w-[42ch] text-sm leading-normal text-muted-foreground">
          {t('emptyStates.notFound.text')}
        </p>
        <div className="flex flex-wrap justify-center gap-2.5">
          <Button asChild className="rounded-lg">
            <Link to="/">{t('emptyStates.notFound.home')}</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-lg border">
            <Link to="/titles">{t('emptyStates.notFound.search')}</Link>
          </Button>
        </div>
        <h2 className="mt-[22px] mb-2.5 text-[11px] font-bold tracking-[0.07em] text-muted-foreground uppercase">
          {t('emptyStates.notFound.headTo')}
        </h2>
        <ul className="flex flex-wrap justify-center gap-2">
          <li>
            <Link
              to="/titles"
              search={{ sort: 'newest' }}
              className={chipClass}
            >
              {t('emptyStates.notFound.newReleases')}
            </Link>
          </li>
          <li>
            <Link to="/titles" search={{ onSale: true }} className={chipClass}>
              {t('emptyStates.notFound.deals')}
            </Link>
          </li>
          <li>
            <Link to="/library" className={chipClass}>
              {t('emptyStates.notFound.library')}
            </Link>
          </li>
          <li>
            <a href={SUPPORT_URL} className={chipClass}>
              {t('emptyStates.notFound.support')}
            </a>
          </li>
        </ul>
      </main>
      <SiteFooter />
    </div>
  )
}

/**
 * Anything a page threw: "couldn't load", with a retry. It takes
 * the root component's place, so it brings the app-wide pieces itself.
 */
function RootError() {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <AppChrome>
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="container flex-1 py-12">
          {/* runs the routes' checks again (reset() alone keeps a failed one) */}
          <ErrorState
            title={t('pages.error.title')}
            onRetry={() => void router.invalidate()}
          />
        </main>
        <SiteFooter />
      </div>
    </AppChrome>
  )
}

function RootComponent() {
  usePreferencesSync()
  useAuthSync()

  return (
    <AppChrome>
      <Outlet />
    </AppChrome>
  )
}

/** What every screen needs around it: tooltips, the auth modal, toasts, the portfolio notice. */
function AppChrome({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <TooltipProvider delayDuration={300}>
      {children}
      <AuthDialog />
      <Toaster containerAriaLabel={t('toasts.region')} />
      <PortfolioNotice />
    </TooltipProvider>
  )
}

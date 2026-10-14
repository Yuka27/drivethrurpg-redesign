import { Link, useMatch, useRouterState } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  HeartIcon,
  LibraryBigIcon,
  LockIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { AccountMenu } from './account-menu'
import { AiContentToggle } from './ai-content-toggle'
import { CountBadge } from './count-badge'
import { IconTooltip } from './icon-tooltip'
import { LoginButton } from './login-button'
import { Logo } from './logo'
import { MobileMenu } from './mobile-menu'
import { NotificationsPopover } from './notifications-popover'
import { CurrencySelect, LanguageSelect } from './preference-selects'
import { SearchBar } from './search-bar'
import { SiteNav } from './site-nav'
import { ThemeToggle } from './theme-toggle'
import { useMe } from '@/api/me'
import type { Me } from '@/api/me'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLastLibrarySearch } from '@/features/library/library-search'
import { safeLocalStorage } from '@/lib/safe-storage'
import { useHeightVar } from '@/lib/use-height-var'
import { cn } from '@/lib/utils'

type SiteHeaderProps = {
  /** "focus" is the minimal checkout/auth header: logo only */
  variant?: 'full' | 'focus'
}

export function SiteHeader({ variant = 'full' }: SiteHeaderProps) {
  const { data: me, isPending } = useMe()
  const sessionHint = useSessionHint(me)
  const headerRef = useRef<HTMLElement>(null)
  // on /search?q=: the words, shown in the field
  const searchQuery = useRouterState({
    select: (state) => {
      const { q } = state.location.search as { q?: unknown }
      return state.location.pathname === '/search' && typeof q === 'string'
        ? q
        : ''
    },
  })
  // sticky parts below it (the product page's menu) stick under this height
  useHeightVar(headerRef, '--header-h')

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-background">
      <div className="container">
        {variant === 'focus' ? (
          <div className="flex h-12 items-center gap-3 border-b">
            <Logo />
            <FocusActions />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 py-4 lg:flex-nowrap lg:gap-x-3 lg:border-b lg:py-2">
            <MobileMenu />

            <Logo />

            <SearchBar
              // a new search (or leaving it) starts the field from its words
              key={searchQuery}
              initialQuery={searchQuery}
              className="order-last w-full lg:order-none lg:w-auto lg:flex-1"
            />

            {isPending ? (
              <ActionsSkeleton signedIn={sessionHint === 'user'} />
            ) : me ? (
              <UserActions user={me} />
            ) : (
              <GuestActions />
            )}
          </div>
        )}
        {variant === 'full' && <SiteNav />}
      </div>
    </header>
  )
}

/**
 * The minimal header's right side: "Secure checkout" and
 * "Back to cart" while paying, "Continue shopping" once the order is placed.
 */
function FocusActions() {
  const { t } = useTranslation('checkout')
  const onCheckout = useMatch({ from: '/_focus/checkout', shouldThrow: false })
  const linkClass =
    'ml-auto text-sm text-muted-foreground hover:text-foreground'
  if (onCheckout)
    return (
      <>
        <span className="ml-auto flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <LockIcon aria-hidden className="size-3.5" />
          <span className="max-sm:sr-only">{t('secure')}</span>
        </span>
        <Link
          to="/cart"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon aria-hidden className="size-3.5" />
          {t('backToCart')}
        </Link>
      </>
    )
  return (
    <Link to="/" className={linkClass}>
      {t('continueShopping')}
    </Link>
  )
}

function GuestActions() {
  const { t } = useTranslation()
  return (
    <div className="ml-auto flex items-center gap-1">
      <div className="hidden items-center gap-1 lg:flex">
        <CurrencySelect />
        <LanguageSelect />
        <AiContentToggle />
        <ThemeToggle />
      </div>
      <HeaderIconLink
        to="/cart"
        icon={ShoppingCartIcon}
        label={t('header.cart.label')}
      />
      <LoginButton>{t('header.login')}</LoginButton>
    </div>
  )
}

const SESSION_HINT = 'dtrpg-session-hint'

/**
 * Whether this device last saw an account or a guest ("user" | "guest"), so
 * the header's outline while /me loads has the shape that will most likely
 * come (an avatar, or "Log In") instead of jumping when it arrives.
 */
function useSessionHint(me: Me | null | undefined) {
  const [hint] = useState(() => safeLocalStorage.getItem(SESSION_HINT))
  useEffect(() => {
    if (me !== undefined)
      safeLocalStorage.setItem(SESSION_HINT, me ? 'user' : 'guest')
  }, [me])
  return hint
}

/** The right side while /me loads, in the shape of an account's or a guest's. */
function ActionsSkeleton({ signedIn }: { signedIn: boolean }) {
  return signedIn ? (
    <div aria-hidden className="ml-auto flex items-center gap-1 lg:gap-3">
      <div className="flex items-center gap-1">
        {/* My Library: an icon on phones, the words on desktop */}
        <Skeleton className="size-8 rounded-lg lg:w-[112px]" />
        <Skeleton className="size-8 rounded-lg max-lg:hidden" />
      </div>
      <div className="flex items-center gap-1">
        <Skeleton className="size-8 rounded-lg max-lg:hidden" />
        <Skeleton className="size-8 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton
        data-testid="avatar-skeleton"
        className="size-8 rounded-full max-lg:hidden"
      />
    </div>
  ) : (
    <div aria-hidden className="ml-auto flex items-center gap-1">
      <div className="flex items-center gap-1 max-lg:hidden">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-14 rounded-lg" />
        <Skeleton className="h-8 w-10 rounded-lg" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="size-8 rounded-lg" />
      <Skeleton className="h-8 w-[72px] rounded-lg" />
    </div>
  )
}

/** Logged in: My Library + wishlist | theme (desktop) + notifications + cart | avatar menu (desktop). */
function UserActions({ user }: { user: Me }) {
  const { t } = useTranslation()
  const librarySearch = useLastLibrarySearch((state) => state.search)
  const { counts } = user
  return (
    <div className="ml-auto flex items-center gap-1 lg:gap-3">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="size-8 px-0 lg:w-auto lg:px-2.5"
        >
          <Link
            to="/library"
            search={librarySearch}
            aria-label={t('header.myLibrary')}
          >
            <LibraryBigIcon aria-hidden />
            <span className="hidden lg:inline">{t('header.myLibrary')}</span>
          </Link>
        </Button>
        <HeaderIconLink
          to="/wishlist"
          icon={HeartIcon}
          label={t('header.wishlist.label')}
          count={counts.wishlist}
          countLabel={t('header.wishlist.withCount', {
            count: counts.wishlist,
          })}
          className="hidden lg:inline-flex"
        />
      </div>
      <div className="flex items-center gap-1">
        {/* as for guests; phones switch it in the menu */}
        <div className="max-lg:hidden">
          <ThemeToggle />
        </div>
        <NotificationsPopover
          unread={counts.unreadNotifications}
          label={t('header.notifications.label')}
          countLabel={t('header.notifications.withCount', {
            count: counts.unreadNotifications,
          })}
        />
        <HeaderIconLink
          to="/cart"
          icon={ShoppingCartIcon}
          label={t('header.cart.label')}
          count={counts.cart}
          countLabel={t('header.cart.withCount', { count: counts.cart })}
        />
      </div>
      <div className="hidden lg:block">
        <AccountMenu user={user} />
      </div>
    </div>
  )
}

type HeaderIconLinkProps = {
  to: ComponentProps<typeof Link>['to']
  icon: LucideIcon
  label: string
  /** shown as a badge when above 0 */
  count?: number
  /** full accessible name when count > 0, e.g. "Cart, 3 items" (translated, pluralised) */
  countLabel?: string
  className?: string
}

function HeaderIconLink({
  to,
  icon: Icon,
  label,
  count = 0,
  countLabel,
  className,
}: HeaderIconLinkProps) {
  const accessibleName = count > 0 && countLabel ? countLabel : label

  return (
    <IconTooltip label={label}>
      <Button
        variant="outline"
        size="icon-sm"
        asChild
        className={cn('relative', className)}
      >
        <Link to={to} aria-label={accessibleName}>
          <Icon aria-hidden />
          <CountBadge count={count} />
        </Link>
      </Button>
    </IconTooltip>
  )
}

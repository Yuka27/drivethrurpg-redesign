import { Link } from '@tanstack/react-router'
import {
  BellIcon,
  HeartIcon,
  LibraryBigIcon,
  ShoppingCartIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { AccountMenu } from './account-menu'
import { AiContentToggle } from './ai-content-toggle'
import { IconTooltip } from './icon-tooltip'
import { LoginButton } from './login-button'
import { Logo } from './logo'
import { MobileMenu } from './mobile-menu'
import { CurrencySelect, LanguageSelect } from './preference-selects'
import { SearchBar } from './search-bar'
import { ThemeToggle } from './theme-toggle'
import { useMe } from '@/api/me'
import type { Me } from '@/api/me'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

type SiteHeaderProps = {
  /** "focus" is the minimal checkout/auth header: logo only */
  variant?: 'full' | 'focus'
}

export function SiteHeader({ variant = 'full' }: SiteHeaderProps) {
  const { data: me, isPending } = useMe()

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="container">
        {variant === 'focus' ? (
          <div className="flex h-12 items-center border-b">
            <Logo />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 py-4 lg:flex-nowrap lg:gap-x-3 lg:border-b lg:py-2">
            <MobileMenu />

            <Logo />

            <SearchBar className="order-last w-full lg:order-none lg:w-auto lg:flex-1" />

            {me ? (
              <UserActions user={me} />
            ) : (
              <GuestActions loading={isPending} />
            )}
          </div>
        )}
      </div>
    </header>
  )
}

function GuestActions({ loading }: { loading: boolean }) {
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
      {/* keeps its space while /me loads, so a logged-in user never sees "Log In" flash;
          `invisible` also takes it out of the tab order and the accessibility tree */}
      <LoginButton className={cn(loading && 'invisible')}>
        {t('header.login')}
      </LoginButton>
    </div>
  )
}

/** Figma "logged in": My Library + wishlist | notifications + cart | avatar menu (desktop). */
function UserActions({ user }: { user: Me }) {
  const { t } = useTranslation()
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
          <Link to="/library" aria-label={t('header.myLibrary')}>
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
        <HeaderIconLink
          to="/notifications"
          icon={BellIcon}
          label={t('header.notifications.label')}
          count={counts.unreadNotifications}
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
  const formatNumber = useFormatNumber()
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
          {count > 0 && (
            <Badge
              aria-hidden
              className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 py-0 text-[10px] leading-none tabular-nums"
            >
              {count > 99 ? `${formatNumber(99)}+` : formatNumber(count)}
            </Badge>
          )}
        </Link>
      </Button>
    </IconTooltip>
  )
}

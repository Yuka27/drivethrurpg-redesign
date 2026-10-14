import { Link } from '@tanstack/react-router'
import {
  CreditCardIcon,
  DownloadIcon,
  LogOutIcon,
  SettingsIcon,
  StarIcon,
  UserIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'

import { IconTooltip } from './icon-tooltip'
import { UserAvatar } from './user-avatar'
import { useLogout } from '@/api/auth'
import type { Me } from '@/api/me'
import { useLocales } from '@/api/meta'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { APP_DOWNLOAD_URL } from '@/config/links'
import { cn } from '@/lib/utils'
import { usePreferencesStore } from '@/stores/preferences'

const itemClass = 'gap-1.5 rounded-md px-1.5 py-1 cursor-pointer'
/** Quick preferences: a label on the left, the value on the right. */
const prefClass = 'gap-2.5 rounded-md px-2 py-0.5 text-sm cursor-pointer'

type MenuLinkProps = {
  to: ComponentProps<typeof Link>['to']
  icon: LucideIcon
  label: string
}

function MenuLink({ to, icon: Icon, label }: MenuLinkProps) {
  return (
    <DropdownMenuItem asChild className={itemClass}>
      <Link to={to}>
        <Icon aria-hidden />
        {label}
      </Link>
    </DropdownMenuItem>
  )
}

/**
 * Currency, language and AI content, as menu items (a menu lets the arrow
 * keys, not Tab, move through it, so they cannot be selects and switches):
 * currency and language open a list of choices beside the menu, AI content
 * switches on the spot and keeps the menu open.
 */
function QuickPreferences() {
  const { t } = useTranslation()
  const { data: locales } = useLocales()
  const currency = usePreferencesStore((state) => state.currency)
  const setCurrency = usePreferencesStore((state) => state.setCurrency)
  const language = usePreferencesStore((state) => state.language)
  const setLanguage = usePreferencesStore((state) => state.setLanguage)
  const aiContent = usePreferencesStore((state) => state.aiContent)
  const setAiContent = usePreferencesStore((state) => state.setAiContent)
  const languageShort =
    locales?.languages.find((item) => item.code === language)?.short ??
    language.toUpperCase()

  return (
    <DropdownMenuGroup
      aria-labelledby="quick-preferences"
      className="px-1 pb-4"
    >
      <DropdownMenuLabel
        id="quick-preferences"
        className="px-2 pt-4 pb-2 text-xs leading-4 font-bold text-muted-foreground uppercase"
      >
        {t('menu.quickPreferences')}
      </DropdownMenuLabel>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          className={prefClass}
          aria-label={t('menu.currencyValue', { value: currency })}
        >
          <span className="flex-1">{t('menu.currency')}</span>
          <span className="text-xs font-medium">{currency}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup value={currency} onValueChange={setCurrency}>
            {(
              locales?.currencies ?? [
                { code: currency, label: currency, symbol: '' },
              ]
            ).map((item) => (
              <DropdownMenuRadioItem key={item.code} value={item.code}>
                {item.code}
                <span className="text-xs text-muted-foreground">
                  {item.label}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger
          className={prefClass}
          aria-label={t('menu.languageValue', { value: languageShort })}
        >
          <span className="flex-1">{t('menu.language')}</span>
          <span className="text-xs font-medium uppercase">{languageShort}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuRadioGroup
            value={language}
            onValueChange={(code) => void setLanguage(code)}
          >
            {(
              locales?.languages ?? [
                { code: language, label: language, short: language },
              ]
            ).map((item) => (
              <DropdownMenuRadioItem key={item.code} value={item.code}>
                {item.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuItem
        role="menuitemcheckbox"
        aria-checked={aiContent}
        // switches on the spot: the menu stays open
        onSelect={(event) => {
          event.preventDefault()
          setAiContent(!aiContent)
        }}
        className={prefClass}
      >
        <span className="flex-1">{t('menu.aiContent')}</span>
        {/* the Switch's look; the item itself is the control */}
        <span
          aria-hidden
          className={cn(
            'inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full p-px transition-colors motion-reduce:transition-none',
            aiContent ? 'bg-primary' : 'bg-muted-foreground',
          )}
        >
          <span
            className={cn(
              'size-4 rounded-full bg-background transition-transform motion-reduce:transition-none',
              aiContent &&
                'translate-x-[calc(100%-2px)] dark:bg-primary-foreground',
            )}
          />
        </span>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  )
}

/** Avatar button + account dropdown in the logged-in desktop header. */
export function AccountMenu({ user }: { user: Me }) {
  const { t } = useTranslation()
  const logout = useLogout()

  return (
    <DropdownMenu>
      <IconTooltip label={t('account.tooltip')}>
        <DropdownMenuTrigger
          aria-label={t('account.menuFor', { name: user.displayName })}
          className="rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <UserAvatar user={user} />
        </DropdownMenuTrigger>
      </IconTooltip>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-[198px] rounded-lg p-0"
      >
        <DropdownMenuLabel className="flex items-center gap-2 px-3 pt-3 pb-2 font-normal">
          <UserAvatar user={user} className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user.displayName}</p>
            <p className="truncate text-xs">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild className={itemClass}>
            <a href={APP_DOWNLOAD_URL}>
              <DownloadIcon aria-hidden />
              {t('account.getTheApp')}
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuGroup className="p-1 pb-0">
          <MenuLink
            to="/account"
            icon={UserIcon}
            label={t('account.settings')}
          />
          <MenuLink
            to="/account/preferences"
            icon={SettingsIcon}
            label={t('account.preferences')}
          />
          <MenuLink
            to="/orders"
            icon={CreditCardIcon}
            label={t('account.orders')}
          />
          <MenuLink
            to="/following"
            icon={StarIcon}
            label={t('account.following')}
          />
        </DropdownMenuGroup>
        <QuickPreferences />
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1">
          <DropdownMenuItem
            className={`${itemClass} text-primary-text focus:text-primary-text [&_svg:not([class*='text-'])]:text-primary-text`}
            disabled={logout.isPending}
            onSelect={() => logout.mutate()}
          >
            <LogOutIcon aria-hidden />
            {logout.isPending ? t('account.loggingOut') : t('account.logout')}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

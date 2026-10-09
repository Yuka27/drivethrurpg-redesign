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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Figma: 6px gap and padding, 6px radius
const itemClass = 'gap-1.5 rounded-md px-1.5 py-1'

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

/** Avatar button + account dropdown in the logged-in desktop header. */
export function AccountMenu({ user }: { user: Me }) {
  const { t } = useTranslation()
  const logout = useLogout()

  return (
    <DropdownMenu>
      <IconTooltip label={t('account.tooltip')}>
        <DropdownMenuTrigger
          aria-label={t('account.menuFor', { name: user.displayName })}
          className="rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none cursor-pointer"
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
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild className={itemClass}>
            {/* TODO_URL: app download page not decided yet */}
            <a href="#">
              <DownloadIcon aria-hidden />
              {t('account.getTheApp')}
            </a>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="m-0" />
        <div className="p-1">
          <DropdownMenuItem
            className={`${itemClass} text-primary focus:text-primary [&_svg:not([class*='text-'])]:text-primary`}
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

import { Link, useRouterState } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type NavItem = {
  to: LinkProps['to'] & string
  label: 'account' | 'preferences' | 'orders' | 'following'
  hint?: 'accountHint' | 'preferencesHint'
}

const SECTIONS: Array<{
  title: 'settings' | 'activity'
  items: Array<NavItem>
}> = [
  {
    title: 'settings',
    items: [
      { to: '/account/settings', label: 'account', hint: 'accountHint' },
      {
        to: '/account/preferences',
        label: 'preferences',
        hint: 'preferencesHint',
      },
    ],
  },
  {
    title: 'activity',
    items: [
      { to: '/orders', label: 'orders' },
      { to: '/following', label: 'following' },
    ],
  },
]

/** "Account" is also what /account shows on desktop. */
function useIsCurrent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const path = pathname.replace(/\/+$/, '')
  return (to: string) =>
    to === '/account/settings'
      ? path === '/account' || path === to
      : path === to || path.startsWith(`${to}/`)
}

/** Desktop sidebar: section labels and plain links; the current one in the primary colour. */
export function AccountSidebarNav() {
  const { t } = useTranslation('account')
  const isCurrent = useIsCurrent()

  return (
    <nav aria-label={t('nav.label')} className="flex flex-col gap-4">
      {SECTIONS.map(({ title, items }) => (
        <div key={title} className="flex flex-col gap-1">
          <h2 className="font-sans text-xs leading-4 font-bold tracking-normal text-muted-foreground uppercase">
            {t(`nav.${title}`)}
          </h2>
          <ul>
            {items.map(({ to, label }) => {
              const current = isCurrent(to)
              return (
                <li key={to} className="border-b border-muted">
                  <Link
                    to={to}
                    aria-current={current ? 'page' : undefined}
                    className={cn(
                      'block py-2.5 text-sm font-medium hover:text-primary',
                      current && 'text-primary',
                    )}
                  >
                    {t(`nav.${label}`)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

/** Mobile "My account": each section is a card of rows with a chevron. */
export function AccountHubNav() {
  const { t } = useTranslation('account')

  return (
    <nav aria-label={t('nav.label')} className="flex flex-col gap-4">
      {SECTIONS.map(({ title, items }) => (
        <div key={title} className="grid gap-2">
          <h2 className="font-sans text-xs leading-4 font-bold tracking-normal text-muted-foreground uppercase">
            {t(`nav.${title}`)}
          </h2>
          <ul className="flex flex-col gap-3 rounded-xl bg-card p-6">
            {items.map(({ to, label, hint }, index) => (
              <li
                key={to}
                className={cn(index > 0 && 'border-t border-muted pt-2')}
              >
                <Link to={to} className="flex items-center gap-2.5">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-sm font-semibold">
                      {t(`nav.${label}`)}
                    </span>
                    {hint && (
                      <span className="text-xs text-muted-foreground">
                        {t(`nav.${hint}`)}
                      </span>
                    )}
                  </span>
                  <ChevronRightIcon aria-hidden className="size-4 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

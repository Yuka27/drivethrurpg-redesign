import { Link } from '@tanstack/react-router'
import { ChevronRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Mobile only: "My account › {current}" back to the hub (desktop has the sidebar). */
export function AccountBreadcrumb({ current }: { current: string }) {
  const { t } = useTranslation('account')

  return (
    <nav aria-label={t('breadcrumb')} className="lg:hidden">
      <ol className="flex items-center gap-1.5 text-sm">
        <li>
          <Link
            to="/account"
            className="text-muted-foreground hover:text-foreground"
          >
            {t('myAccount')}
          </Link>
        </li>
        <li aria-hidden>
          <ChevronRightIcon className="size-3.5 text-muted-foreground" />
        </li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  )
}

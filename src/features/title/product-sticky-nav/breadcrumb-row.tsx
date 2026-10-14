import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { UtilityMenus } from './utility-menus'
import type { TitleDetail } from '@/api/titles'
import { useFacetLabel } from '@/components/title/use-facet-label'

const crumbLink =
  'block truncate rounded-sm text-muted-foreground outline-none hover:text-primary-text focus-visible:ring-2 focus-visible:ring-primary'

/**
 * Row 1: "← publisher / product line / title" on the left, the
 * utility menus on the right. The API has no product line, so the middle step
 * is the rule system (the listing filtered by it). The publisher link opens the
 * listing filtered by the publisher, as every publisher link does. Phones keep
 * only the back link.
 */
export function BreadcrumbRow({ title }: { title: TitleDetail }) {
  const { t } = useTranslation('title')
  const facetLabel = useFacetLabel()
  const separator = (
    <li aria-hidden className="opacity-40 max-[700px]:hidden">
      /
    </li>
  )

  return (
    <div className="container flex items-center justify-between gap-4">
      <nav
        aria-label={t('stickyNav.breadcrumb')}
        className="min-w-0 flex-1 py-3 text-sm max-[700px]:py-2.5"
      >
        <ol className="flex min-w-0 items-center gap-2 text-muted-foreground">
          <li className="min-w-0 shrink">
            {title.publisher ? (
              <Link
                to="/titles"
                search={{ publisher: title.publisher.id }}
                className={`${crumbLink} max-w-[340px] max-[700px]:flex max-[700px]:max-w-none max-[700px]:min-h-[38px] max-[700px]:items-center`}
              >
                <ArrowLeftIcon aria-hidden className="mr-1 inline size-3.5" />
                {title.publisher.name}
              </Link>
            ) : (
              <Link
                to="/"
                className={`${crumbLink} max-[700px]:flex max-[700px]:min-h-[38px] max-[700px]:items-center`}
              >
                <ArrowLeftIcon aria-hidden className="mr-1 inline size-3.5" />
                {t('backHome')}
              </Link>
            )}
          </li>
          {title.ruleSystem && (
            <>
              {separator}
              <li className="min-w-0 shrink max-[700px]:hidden">
                <Link
                  to="/titles"
                  search={{ system: title.ruleSystem }}
                  className={`${crumbLink} max-w-[340px]`}
                >
                  {facetLabel('system', title.ruleSystem)}
                </Link>
              </li>
            </>
          )}
          {separator}
          <li
            aria-current="page"
            className="min-w-0 truncate font-bold text-foreground max-[700px]:hidden"
          >
            {title.title}
          </li>
        </ol>
      </nav>
      <UtilityMenus />
    </div>
  )
}

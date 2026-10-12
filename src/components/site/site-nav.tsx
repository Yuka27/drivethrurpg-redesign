import { Link, useMatch } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useBrowseGroups } from './use-browse-groups'
import type { BrowseGroup } from './use-browse-groups'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { linkTarget, utilityMenus } from '@/config/utility-menus'
import { useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

/** Figma "Nav": small pill triggers, catalogue on the left, help on the right. */
const triggerClass =
  'h-6 rounded-full bg-transparent px-2 text-xs font-medium hover:bg-accent focus:bg-accent data-[state=open]:bg-accent/50 [&>svg]:ml-0'

const itemClass =
  'flex-row items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm'

/**
 * Desktop: the row under the header. Each catalogue menu lists the values with
 * the most titles; each opens the listing filtered by that value
 * (/titles?genre=horror). On the listing itself the catalogue menus give way
 * to "Back to Home": its sidebar filters do their job there. The right-hand
 * menus link out to the main site; a product page shows them in its own sticky
 * menu instead (ProductStickyNav), so not here.
 */
export function SiteNav() {
  const { t } = useTranslation(['common', 'listing'])
  const groups = useBrowseGroups()
  const onListing = useMatch({ from: '/_site/titles/', shouldThrow: false })
  const onTitle = useMatch({
    from: '/_site/titles/$titleId',
    shouldThrow: false,
  })

  return (
    <div className="flex h-12 items-center justify-between max-lg:hidden">
      {onListing ? (
        <Link
          to="/"
          className="flex items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <ArrowLeftIcon aria-hidden className="size-3" />
          {t('listing:backHome')}
        </Link>
      ) : (
        <NavigationMenu viewport={false} aria-label={t('nav.label')}>
          <NavigationMenuList className="gap-3">
            {groups.map((group) => (
              <BrowseMenu key={group.facet} group={group} />
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      )}

      {!onTitle && (
        <NavigationMenu viewport={false} aria-label={t('nav.moreLabel')}>
          <NavigationMenuList className="gap-3">
            {utilityMenus.map((group) => (
              <NavigationMenuItem key={group.key}>
                <NavigationMenuTrigger
                  className={cn(triggerClass, 'text-muted-foreground')}
                >
                  {t(group.titleKey)}
                </NavigationMenuTrigger>
                <NavigationMenuContent className="right-0 left-auto">
                  <ul className="flex w-48 flex-col">
                    {group.links.map((link) => (
                      <li key={link.label ?? link.labelKey}>
                        <NavigationMenuLink
                          href={link.href}
                          {...linkTarget(link)}
                          className={itemClass}
                        >
                          {link.labelKey ? t(link.labelKey) : link.label}
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      )}
    </div>
  )
}

function BrowseMenu({ group }: { group: BrowseGroup }) {
  const { t } = useTranslation()
  const formatNumber = useFormatNumber()

  return (
    <NavigationMenuItem>
      <NavigationMenuTrigger className={triggerClass}>
        {group.title}
      </NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul aria-label={group.title} className="flex w-64 flex-col">
          {group.options.map((option) => (
            <li key={option.value}>
              <NavigationMenuLink asChild className={itemClass}>
                <Link to="/titles" search={{ [group.facet]: option.value }}>
                  <span className="truncate">{option.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatNumber(option.count)}
                  </span>
                </Link>
              </NavigationMenuLink>
            </li>
          ))}
          <li className="mt-1 border-t border-muted pt-1">
            <NavigationMenuLink
              asChild
              className={cn(itemClass, 'font-medium text-primary')}
            >
              <Link to="/titles">{t('nav.browseAll')}</Link>
            </NavigationMenuLink>
          </li>
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  )
}

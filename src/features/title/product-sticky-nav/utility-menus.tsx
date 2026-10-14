import { EllipsisIcon } from 'lucide-react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { linkTarget, utilityMenus } from '@/config/utility-menus'
import type { FooterLink } from '@/config/footer'

/**
 * Row 1, right: Community, Information, Support. Desktop: a
 * navigation menu each (opens on hover, a click or Enter; arrow keys move
 * between the links; Escape closes). Phones (< 700px): one "⋯" button with
 * the three as labelled groups.
 */
export function UtilityMenus() {
  const { t } = useTranslation()
  const { t: tTitle } = useTranslation('title')
  const label = (link: FooterLink) =>
    link.labelKey ? t(link.labelKey) : link.label

  return (
    <>
      <NavigationMenu
        viewport={false}
        aria-label={t('nav.moreLabel')}
        className="max-[700px]:hidden"
      >
        <NavigationMenuList className="gap-0">
          {utilityMenus.map((menu) => (
            <NavigationMenuItem key={menu.key}>
              <NavigationMenuTrigger
                aria-haspopup="true"
                className="h-auto rounded-md bg-transparent py-3 pr-0 pl-5 text-sm font-semibold text-muted-foreground hover:bg-transparent hover:text-foreground focus:bg-transparent focus-visible:ring-2 focus-visible:ring-primary data-[state=open]:bg-transparent data-[state=open]:text-foreground data-[state=open]:hover:bg-transparent data-[state=open]:focus:bg-transparent [&>svg]:ml-0.5"
              >
                {t(menu.titleKey)}
              </NavigationMenuTrigger>
              <NavigationMenuContent className="right-0 left-auto z-40 shadow-popover">
                <ul className="flex w-[230px] flex-col">
                  {menu.links.map((link) => (
                    <li key={label(link)}>
                      <NavigationMenuLink
                        href={link.href}
                        {...linkTarget(link)}
                        className="rounded-md px-2.5 py-2 text-[13px] text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {label(link)}
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="icon"
            aria-label={tTitle('stickyNav.more')}
            className="size-9 shrink-0 rounded-lg border border-border focus-visible:ring-2 focus-visible:ring-primary min-[700px]:hidden"
          >
            <EllipsisIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[230px]">
          {utilityMenus.map((menu, index) => (
            <Fragment key={menu.key}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                  {t(menu.titleKey)}
                </DropdownMenuLabel>
                {menu.links.map((link) => (
                  <DropdownMenuItem key={label(link)} asChild>
                    <a href={link.href} {...linkTarget(link)}>
                      {label(link)}
                    </a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

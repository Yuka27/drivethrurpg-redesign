import { Link } from '@tanstack/react-router'
import {
  DownloadIcon,
  HeartIcon,
  LibraryBigIcon,
  MenuIcon,
  PanelLeftCloseIcon,
} from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import { CurrencySelect, LanguageSelect } from './preference-selects'
import { LoginButton } from './login-button'
import { ThemeSegmented } from './theme-toggle'
import { useBrowseGroups } from './use-browse-groups'
import { useLogout } from '@/api/auth'
import { useMe } from '@/api/me'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { APP_DOWNLOAD_URL } from '@/config/links'
import { linkTarget, utilityMenus } from '@/config/utility-menus'
import { useLastOrdersSearch } from '@/features/account/orders-search'
import { useLastLibrarySearch } from '@/features/library/library-search'
import { useFormatNumber } from '@/i18n/format'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { usePreferencesStore } from '@/stores/preferences'

export function MobileMenu() {
  const { t } = useTranslation()
  const aiContent = usePreferencesStore((state) => state.aiContent)
  const setAiContent = usePreferencesStore((state) => state.setAiContent)
  const aiSwitchId = useId()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)
  const { data: me, isPending: meLoading } = useMe()
  const logout = useLogout()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  // back to the library and the orders as the user left them
  const librarySearch = useLastLibrarySearch((state) => state.search)
  const ordersSearch = useLastOrdersSearch((state) => state.search)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          size="icon-sm"
          aria-label={t('menu.open')}
          className="lg:hidden"
        >
          <MenuIcon />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        showCloseButton={false}
        // open accordions can outgrow the screen: the menu scrolls then
        className="h-fit max-h-dvh w-full gap-0 overflow-y-auto rounded-r-xl border-r-0 bg-popover text-popover-foreground sm:max-w-sm"
      >
        <div className="flex items-center gap-2.5 p-4">
          <SheetTitle className="flex-1 text-base font-medium">
            {t('menu.title')}
          </SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('menu.close')}>
              <PanelLeftCloseIcon className="size-6" strokeWidth={1.5} />
            </Button>
          </SheetClose>
        </div>
        <SheetDescription className="sr-only">
          {t(me ? 'menu.descriptionUser' : 'menu.descriptionGuest')}
        </SheetDescription>

        <div className="flex flex-col gap-3 px-4 py-2">
          <div className="flex flex-col items-start gap-1">
            <Link to="/wishlist" onClick={close} className={quickLinkClass}>
              <HeartIcon aria-hidden className="size-4" />
              {t('menu.wishlist')}
            </Link>
            {me && (
              <Link
                to="/library"
                search={librarySearch}
                onClick={close}
                className={quickLinkClass}
              >
                <LibraryBigIcon aria-hidden className="size-4" />
                {t('menu.library')}
              </Link>
            )}
            {/* the library apps: for someone with a library */}
            {me && (
              <a
                href={APP_DOWNLOAD_URL}
                onClick={close}
                className={quickLinkClass}
              >
                <DownloadIcon aria-hidden className="size-4" />
                {t('account.getTheApp')}
              </a>
            )}
          </div>
          <MenuNav onNavigate={close} />
          {/* mobile has no avatar menu: the account pages live here */}
          {me && (
            <nav
              aria-labelledby={`${aiSwitchId}-settings`}
              className="flex flex-col gap-1"
            >
              <h2 id={`${aiSwitchId}-settings`} className={sectionTitleClass}>
                {t('menu.settings')}
              </h2>
              <ul>
                <li>
                  <Link
                    to="/account/settings"
                    onClick={close}
                    className={pageLinkClass}
                  >
                    {t('menu.account')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account/preferences"
                    onClick={close}
                    className={pageLinkClass}
                  >
                    {t('account.preferences')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/orders"
                    search={ordersSearch}
                    onClick={close}
                    className={pageLinkClass}
                  >
                    {t('account.orders')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/following"
                    onClick={close}
                    className={pageLinkClass}
                  >
                    {t('account.following')}
                  </Link>
                </li>
              </ul>
            </nav>
          )}
        </div>

        <section
          aria-labelledby={`${aiSwitchId}-prefs`}
          className="flex flex-col gap-3 px-4 py-2"
        >
          <h2 id={`${aiSwitchId}-prefs`} className={sectionTitleClass}>
            {t('menu.quickPreferences')}
          </h2>
          <MenuRow label={t('menu.currency')}>
            <CurrencySelect />
          </MenuRow>
          <MenuRow label={t('menu.language')}>
            <LanguageSelect className="uppercase" />
          </MenuRow>
          <MenuRow label={t('menu.theme')}>
            <ThemeSegmented />
          </MenuRow>
          <div className="flex items-center gap-2.5">
            <label htmlFor={aiSwitchId} className="flex-1 text-sm">
              {t('menu.aiContent')}
            </label>
            <Switch
              id={aiSwitchId}
              checked={aiContent}
              onCheckedChange={setAiContent}
            />
          </div>
        </section>

        {meLoading ? (
          <div aria-hidden className="flex justify-center p-5">
            <Skeleton className="h-5 w-16" />
          </div>
        ) : me ? (
          <div className="flex justify-center p-5">
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: close })}
              className="rounded-md px-2 py-1 text-sm text-primary-text outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            >
              {logout.isPending ? t('account.loggingOut') : t('account.logout')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 p-5">
            <LoginButton
              className="w-full"
              onOpen={close}
              // this button leaves with the menu; return focus to the ☰ button instead
              returnFocusTo={triggerRef.current}
            >
              {t('menu.login')}
            </LoginButton>
            <p className="text-center text-sm text-muted-foreground">
              {t('menu.newHere')}{' '}
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => {
                  close()
                  // the menu (and this button) goes away: return focus to the ☰ button
                  openAuth('register', { returnFocusTo: triggerRef.current })
                }}
                className="text-primary-text hover:underline"
              >
                {t('menu.createAccount')}
              </button>
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

/** Wishlist and My library: an icon and a word, 32px high. */
const quickLinkClass =
  'flex h-8 items-center gap-1 rounded-md text-sm font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50'

/** The account pages: rows like the accordions above, without a chevron. */
const pageLinkClass =
  'flex rounded-md border-b border-muted py-2.5 text-sm font-medium outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50'

const sectionTitleClass =
  'font-sans text-xs font-bold tracking-normal text-muted-foreground uppercase'

const triggerClass =
  'py-2.5 hover:no-underline [&>svg]:translate-y-0.5 [&>svg]:text-foreground'

const linkClass =
  'flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground'

/**
 * The mobile menu: "Browse" (the catalogue facets, each value a link to the
 * listing filtered by it) and "More" (links out to the main site), as
 * accordions. Following a link closes the menu.
 */
function MenuNav({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation()
  const groups = useBrowseGroups()
  const formatNumber = useFormatNumber()

  return (
    <>
      {!groups ? (
        <div aria-hidden className="flex flex-col gap-1">
          <Skeleton className="mb-2 h-3 w-16" />
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="border-b border-muted py-3">
              <Skeleton className="h-4 w-28" />
            </div>
          ))}
        </div>
      ) : (
        groups.length > 0 && (
          <nav aria-label={t('nav.label')} className="flex flex-col gap-1">
            <h2 className={sectionTitleClass}>{t('menu.browse')}</h2>
            <Accordion type="single" collapsible>
              {groups.map((group) => (
                <AccordionItem
                  key={group.facet}
                  value={group.facet}
                  className="border-muted last:border-b"
                >
                  <AccordionTrigger className={triggerClass}>
                    {group.title}
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <ul>
                      {group.options.map((option) => (
                        <li key={option.value}>
                          <Link
                            to="/titles"
                            search={{ [group.facet]: option.value }}
                            onClick={onNavigate}
                            className={linkClass}
                          >
                            <span className="truncate">{option.label}</span>
                            <span className="text-xs tabular-nums">
                              {formatNumber(option.count)}
                            </span>
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link
                          to="/titles"
                          onClick={onNavigate}
                          className={`${linkClass} font-medium text-primary-text`}
                        >
                          {t('nav.browseAll')}
                        </Link>
                      </li>
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </nav>
        )
      )}
      <nav aria-label={t('nav.moreLabel')} className="flex flex-col gap-1">
        <h2 className={sectionTitleClass}>{t('menu.more')}</h2>
        <Accordion type="single" collapsible>
          {utilityMenus.map((group) => (
            <AccordionItem
              key={group.key}
              value={group.key}
              className="border-muted last:border-b"
            >
              <AccordionTrigger className={triggerClass}>
                {t(group.titleKey)}
              </AccordionTrigger>
              <AccordionContent className="pb-2">
                <ul>
                  {group.links.map((link) => (
                    <li key={link.label ?? link.labelKey}>
                      <a
                        href={link.href}
                        {...linkTarget(link)}
                        className={linkClass}
                      >
                        {link.labelKey ? t(link.labelKey) : link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </nav>
    </>
  )
}

/** Label on the left, control on the right. The control carries its own aria-label. */
function MenuRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="flex-1 text-sm">
        {label}
      </span>
      {children}
    </div>
  )
}

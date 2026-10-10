import { MenuIcon, PanelLeftCloseIcon } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

import { CurrencySelect, LanguageSelect } from './preference-selects'
import { LoginButton } from './login-button'
import { ThemeSegmented } from './theme-toggle'
import { UserAvatar } from './user-avatar'
import { useLogout } from '@/api/auth'
import { useMe } from '@/api/me'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
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
  const { data: me } = useMe()
  const logout = useLogout()
  const openAuth = useAuthDialogStore((state) => state.openAuth)

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
        className="h-fit w-full gap-0 rounded-r-xl border-r-0 bg-popover text-popover-foreground sm:max-w-sm"
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

        <section
          aria-labelledby={`${aiSwitchId}-prefs`}
          className="flex flex-col gap-3 px-4 py-2"
        >
          <h2
            id={`${aiSwitchId}-prefs`}
            className="font-sans text-xs font-bold tracking-normal text-muted-foreground uppercase"
          >
            {t('menu.preferences')}
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

        {me ? (
          // not in Figma: mobile has no avatar menu, so account + log out live here
          <div className="flex flex-col gap-3 p-5">
            <div className="flex items-center gap-2">
              <UserAvatar user={me} className="size-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{me.displayName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {me.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={logout.isPending}
              onClick={() => logout.mutate(undefined, { onSuccess: close })}
            >
              {logout.isPending ? t('account.loggingOut') : t('account.logout')}
            </Button>
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
                className="text-primary hover:underline"
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

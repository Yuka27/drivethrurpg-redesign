import {
  ArrowUpRightIcon,
  ChartColumnIcon,
  CodeXmlIcon,
  InfoIcon,
  PanelsTopLeftIcon,
  ServerIcon,
  XIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { usePortfolioNotice } from './use-portfolio-notice'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { projectLinks } from '@/config/project-links'
import type { ProjectLinkId } from '@/config/project-links'
import { env } from '@/lib/env'
import { useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'

/** On its own on a first visit: not in tests (they open it themselves), nor when turned off. */
const AUTO_OPEN =
  env.VITE_SHOW_PORTFOLIO_NOTICE && import.meta.env.MODE !== 'test'

const LINKS: Array<{ id: ProjectLinkId; icon: LucideIcon }> = [
  { id: 'figma', icon: PanelsTopLeftIcon },
  { id: 'github', icon: CodeXmlIcon },
  { id: 'apiDocs', icon: ServerIcon },
  { id: 'coverage', icon: ChartColumnIcon },
]

const FACTS = ['sale', 'data', 'affiliation'] as const

/**
 * "You are looking at a design case study, not a shop": the first visit's
 * notice that this is a portfolio project. A glass dialog on desktop, a bottom
 * sheet on phones. X, Esc, the backdrop and "Enter the prototype" all dismiss
 * it; "Don't show this again" keeps it away for good, otherwise until the next
 * browser session (`notice-storage.ts`). The footer's "About this project" and
 * `?about=1` open it whatever was chosen.
 */
export function PortfolioNotice({
  autoOpen = AUTO_OPEN,
}: {
  autoOpen?: boolean
}) {
  const { t } = useTranslation('portfolioNotice')
  const open = usePortfolioNotice((state) => state.open)
  const forever = usePortfolioNotice((state) => state.forever)
  const returnFocusTo = usePortfolioNotice((state) => state.returnFocusTo)
  const setForever = usePortfolioNotice((state) => state.setForever)
  const dismiss = usePortfolioNotice((state) => state.dismiss)
  const enterRef = useRef<HTMLButtonElement>(null)
  // phones get the shorter copy: one version in the page, so the dialog's
  // name and description are the words on screen
  const narrow = useMediaQuery('(max-width: 639.98px)')

  // after the first paint, so it never holds back the page or its data
  useEffect(() => {
    const { show, showIfFirstVisit } = usePortfolioNotice.getState()
    if (new URLSearchParams(window.location.search).get('about') === '1') show()
    else if (autoOpen) showIfFirstVisit()
  }, [autoOpen])

  const links = LINKS.filter(({ id }) => projectLinks[id])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss()
      }}
    >
      <DialogPortal>
        <DialogPrimitive.Overlay className="glass-overlay fixed inset-0 z-[var(--z-notice)] duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          // "Enter the prototype" first: the one thing most visitors want
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            enterRef.current?.focus()
          }}
          // opened from the store, not a trigger: back to the footer link, if that opened it
          onCloseAutoFocus={(event) => {
            if (returnFocusTo?.isConnected) {
              event.preventDefault()
              returnFocusTo.focus()
            }
          }}
          className={cn(
            // the dark theme's colours over the dark glass, in both themes
            'dark glass-panel fixed z-[var(--z-notice)] flex flex-col gap-5 overflow-y-auto overscroll-contain text-foreground outline-none',
            // desktop: centred
            'sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-32px)] sm:w-[min(680px,calc(100vw-32px))] sm:-translate-1/2 sm:gap-6 sm:rounded-[24px] sm:p-10',
            // phones: a sheet from the bottom, its content scrolling inside
            'max-sm:inset-x-0 max-sm:bottom-0 max-sm:max-h-[90dvh] max-sm:rounded-t-[24px] max-sm:border-b-0 max-sm:px-5 max-sm:pt-6 max-sm:pb-[max(20px,env(safe-area-inset-bottom))]',
            // a fade; with motion, a small scale (desktop) or a slide up (phones)
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 sm:duration-150 max-sm:duration-200',
            'sm:motion-safe:data-[state=closed]:zoom-out-98 sm:motion-safe:data-[state=open]:zoom-in-98',
            'max-sm:motion-safe:data-[state=closed]:slide-out-to-bottom max-sm:motion-safe:data-[state=open]:slide-in-from-bottom',
          )}
        >
          <div className="flex flex-col items-start gap-3 pr-12">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-notice px-2.5 py-1 text-xs leading-4 font-bold tracking-wide text-notice-foreground uppercase">
              <InfoIcon aria-hidden className="size-3.5 shrink-0" />
              {t(narrow ? 'badgeShort' : 'badge')}
            </p>
            <DialogTitle asChild>
              <h1 className="font-sans text-[24px] leading-[30px] font-bold tracking-normal text-foreground sm:text-[28px] sm:leading-[34px]">
                {t(narrow ? 'titleShort' : 'title')}
              </h1>
            </DialogTitle>
          </div>
          <DialogDescription className="-mt-1 text-[14px] leading-[21px] text-glass-muted sm:-mt-2 sm:text-[15px] sm:leading-6">
            {t(narrow ? 'leadShort' : 'lead')}
          </DialogDescription>

          {/* phones: the lead already says all three */}
          <ul
            aria-label={t('facts.label')}
            className="grid grid-cols-3 gap-3 max-sm:hidden"
          >
            {FACTS.map((fact) => (
              <li
                key={fact}
                className="flex flex-col gap-1 rounded-xl border border-glass-border bg-glass-tile p-4"
              >
                <span className="text-[15px] leading-5 font-bold">
                  {t(`facts.${fact}.title`)}
                </span>
                <span className="text-[13px] leading-[19px] text-glass-muted">
                  {t(`facts.${fact}.text`)}
                </span>
              </li>
            ))}
          </ul>

          {links.length > 0 && (
            <section
              aria-labelledby="portfolio-notice-explore"
              className="flex flex-col gap-3"
            >
              <h2
                id="portfolio-notice-explore"
                className="font-sans text-xs leading-4 font-semibold tracking-[0.12em] text-glass-muted uppercase max-sm:sr-only"
              >
                {t('explore')}
              </h2>
              <ul className="grid grid-cols-2 gap-3">
                {links.map(({ id, icon: Icon }) => (
                  <li key={id} className="min-w-0">
                    <a
                      href={projectLinks[id]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-[52px] items-center gap-3 rounded-xl border border-glass-border bg-glass-tile px-4 py-2.5 transition-colors outline-none hover:bg-glass-tile-hover focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none sm:min-h-14"
                    >
                      <Icon aria-hidden className="size-5 shrink-0" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] leading-5 font-semibold">
                          {t(
                            narrow
                              ? `links.${id}.titleShort`
                              : `links.${id}.title`,
                          )}
                        </span>
                        <span className="truncate text-[13px] leading-[18px] text-glass-muted max-sm:hidden">
                          {t(`links.${id}.text`)}
                        </span>
                        <span className="sr-only"> {t('opensInNewTab')}</span>
                      </span>
                      <ArrowUpRightIcon
                        aria-hidden
                        className="size-4 shrink-0 text-glass-muted max-sm:hidden"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* phones: the button full width, the checkbox centred under it */}
          <div className="flex items-center justify-between gap-4 max-sm:flex-col-reverse max-sm:gap-2">
            <label className="inline-flex min-h-11 items-center gap-3 text-[15px] leading-6">
              <input
                type="checkbox"
                checked={forever}
                onChange={(event) => setForever(event.target.checked)}
                className="size-[18px] shrink-0 accent-notice-accent"
              />
              {t('dontShowAgain')}
            </label>
            <DialogClose asChild>
              <Button
                ref={enterRef}
                className="h-12 rounded-xl px-7 text-[15px] font-bold max-sm:w-full"
              >
                {t('enter')}
              </Button>
            </DialogClose>
          </div>

          <p className="border-t border-glass-border pt-5 text-xs leading-[18px] text-glass-muted">
            {t(narrow ? 'smallPrintShort' : 'smallPrint')}
          </p>

          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('close')}
              className="absolute top-3 right-3 size-11 rounded-full text-glass-muted hover:bg-glass-tile-hover hover:text-foreground sm:top-6 sm:right-6"
            >
              <XIcon aria-hidden className="size-5" />
            </Button>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

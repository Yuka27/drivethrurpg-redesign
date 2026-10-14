import { Link } from '@tanstack/react-router'
import { WifiOffIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { STATUS_URL, SUPPORT_URL } from '@/config/links'
import { cn } from '@/lib/utils'

/**
 * Mockup docs/Empty and No-Result States: when there is nothing to show, say
 * what happened (plain words, the user's query when there is one), offer one
 * primary action, and help recover. An icon in a circle, a heading, a line,
 * then whatever helps (`children`: actions, suggestions, links).
 */
export function EmptyState({
  icon,
  title,
  text,
  as: Heading = 'h2',
  children,
  className,
}: {
  icon: ReactNode
  title: ReactNode
  text?: ReactNode
  /** h1 when the state is the whole page (404) */
  as?: 'h1' | 'h2'
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center px-4 py-8 text-center',
        className,
      )}
    >
      <span
        aria-hidden
        className="mb-4 grid size-[76px] place-items-center rounded-full bg-secondary text-muted-foreground [&_svg]:size-11 [&_svg]:stroke-[1.4]"
      >
        {icon}
      </span>
      <Heading className="mb-1.5 font-heading text-xl font-bold text-balance">
        {title}
      </Heading>
      {text && (
        <p className="mb-[18px] max-w-[42ch] text-sm leading-normal text-muted-foreground">
          {text}
        </p>
      )}
      {children}
    </div>
  )
}

/** The buttons: one primary, the rest secondary. */
export function EmptyActions({ children }: { children: ReactNode }) {
  return (
    <div className="mb-1.5 flex flex-wrap justify-center gap-2.5">
      {children}
    </div>
  )
}

/** "POPULAR RIGHT NOW": a small heading over suggestions. */
export function EmptyLabel({
  children,
  id,
}: {
  children: ReactNode
  id?: string
}) {
  return (
    <h3
      id={id}
      className="mt-[22px] mb-2.5 text-[11px] font-bold tracking-[0.07em] text-muted-foreground uppercase"
    >
      {children}
    </h3>
  )
}

/** "Bought it recently? Check Orders →": a quiet way out. */
export function EmptyLink(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className="mt-3.5 block text-sm font-semibold text-primary hover:underline"
    />
  )
}

/**
 * Mockup "Error: couldn't load": what failed, that it is not the user's fault
 * and their things are safe, a retry and a way to support.
 */
export function ErrorState({
  title,
  text,
  onRetry,
  className,
}: {
  /** "We couldn’t load your library" */
  title: string
  text?: string
  onRetry?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={<WifiOffIcon />}
      title={title}
      text={text ?? t('emptyStates.error.text')}
      className={className}
    >
      <EmptyActions>
        {onRetry && (
          <Button onClick={onRetry} className="rounded-lg">
            {t('actions.tryAgain')}
          </Button>
        )}
        <Button asChild variant="secondary" className="rounded-lg border">
          <a href={SUPPORT_URL}>{t('emptyStates.error.support')}</a>
        </Button>
      </EmptyActions>
      <a
        href={STATUS_URL}
        className="mt-3.5 block text-sm font-semibold text-primary hover:underline"
      >
        {t('emptyStates.error.status')}
      </a>
    </EmptyState>
  )
}

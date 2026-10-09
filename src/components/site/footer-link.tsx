import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { FooterLink as FooterLinkData } from '@/config/footer'
import { cn } from '@/lib/utils'

type FooterLinkProps = {
  link: FooterLinkData
  className?: string
  children?: ReactNode
}

/** Small pill-padded footer link; external links open in a new tab. */
export function FooterLink({ link, className, children }: FooterLinkProps) {
  const { t } = useTranslation()
  return (
    <a
      href={link.href}
      {...(link.external && { target: '_blank', rel: 'noopener noreferrer' })}
      className={cn(
        'inline-flex min-h-6 items-center rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
        className,
      )}
    >
      {children ?? (link.labelKey ? t(link.labelKey) : link.label)}
      {link.external && (
        <span className="sr-only"> {t('actions.opensInNewTab')}</span>
      )}
    </a>
  )
}

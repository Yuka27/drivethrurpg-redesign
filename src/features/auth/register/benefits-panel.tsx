import {
  BellIcon,
  CreditCardIcon,
  GiftIcon,
  HeartIcon,
  LibraryBigIcon,
  LockIcon,
  MinusIcon,
  PlusIcon,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

const BENEFITS: Array<{
  key: 'library' | 'wishlist' | 'follow' | 'checkout' | 'gifts'
  icon: LucideIcon
}> = [
  { key: 'library', icon: LibraryBigIcon },
  { key: 'wishlist', icon: HeartIcon },
  { key: 'follow', icon: BellIcon },
  { key: 'checkout', icon: CreditCardIcon },
  { key: 'gifts', icon: GiftIcon },
]

function BenefitList({ className }: { className?: string }) {
  const { t } = useTranslation('auth')
  return (
    <ul className={cn('grid gap-4', className)}>
      {BENEFITS.map(({ key, icon: Icon }) => (
        <li key={key} className="grid grid-cols-[36px_1fr] items-start gap-3">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-[10px] border border-border bg-foreground/[0.07]"
          >
            <Icon className="size-[18px]" />
          </span>
          <div>
            <b className="block text-[0.92rem]">
              {t(`register.why.${key}.title`)}
            </b>
            <span className="text-[0.82rem] text-muted-foreground">
              {t(`register.why.${key}.body`)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Desktop (1000px+): a panel beside the form.
 * Below: a collapsed "Why create an account?" under the form, so it never pushes the form down.
 */
export function BenefitsPanel() {
  const { t } = useTranslation('auth')

  return (
    <>
      <aside
        aria-labelledby="register-why-title"
        className="mt-18 hidden rounded-[18px] border border-border bg-card bg-[radial-gradient(130%_120%_at_0%_100%,color-mix(in_oklch,var(--primary)_26%,transparent),transparent_58%)] p-[30px] min-[1000px]:block"
      >
        <p className="text-[0.74rem] font-bold tracking-[0.05em] text-primary uppercase">
          {t('register.why.eyebrow')}
        </p>
        <h2
          id="register-why-title"
          className="mt-2 mb-5 text-[1.35rem] leading-tight"
        >
          {t('register.why.title')}
        </h2>
        <BenefitList />
        <p className="mt-[22px] flex items-center gap-2 border-t border-border pt-4 text-[0.8rem] text-muted-foreground">
          <LockIcon aria-hidden className="size-4 shrink-0" />
          {t('register.why.trust')}
        </p>
      </aside>

      <details className="group rounded-[14px] border border-border bg-card min-[1000px]:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between rounded-[14px] px-4 py-3.5 font-heading text-[0.9rem] font-bold outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
          {t('register.why.toggle')}
          <PlusIcon
            aria-hidden
            className="size-4 text-muted-foreground group-open:hidden"
          />
          <MinusIcon
            aria-hidden
            className="hidden size-4 text-muted-foreground group-open:block"
          />
        </summary>
        <BenefitList className="px-4 pt-0.5 pb-[18px]" />
      </details>
    </>
  )
}

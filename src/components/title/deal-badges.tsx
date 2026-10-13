import { useTranslation } from 'react-i18next'

import type { TitleSummary } from '@/api/titles'
import { useFormatMoney, useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

/** How much cheaper than the list price, as a fraction (0 when not on sale). */
export function discountOf(title: TitleSummary) {
  const list = title.listPrice?.amount ?? 0
  return title.onSale && list > title.price.amount
    ? (list - title.price.amount) / list
    : 0
}

/**
 * Figma: "-40%" and "$5.99" (dark) chips over a cover's bottom corner. The
 * discount is lime on promos, red (`tone="primary"`) on the home's featured
 * covers. No discount chip when the title is not on sale.
 */
export function DealBadges({
  title,
  tone = 'update',
  className,
}: {
  title: TitleSummary
  tone?: 'update' | 'primary'
  className?: string
}) {
  const { t } = useTranslation('listing')
  const formatMoney = useFormatMoney()
  const formatPercent = useFormatNumber({
    style: 'percent',
    maximumFractionDigits: 0,
  })
  const discount = discountOf(title)

  return (
    <span className={cn('flex items-center gap-1', className)}>
      {discount > 0 && (
        <span
          className={cn(
            'rounded-sm px-2 py-0.5 text-xs font-medium',
            tone === 'primary'
              ? 'bg-primary text-primary-foreground'
              : 'bg-update text-update-foreground',
          )}
        >
          <span className="sr-only">{t('card.discount')} </span>-
          {formatPercent(discount)}
        </span>
      )}
      <span className="rounded-sm bg-black/70 px-2 py-0.5 text-xs font-medium text-white">
        {title.price.amount === 0 ? t('price.free') : formatMoney(title.price)}
      </span>
    </span>
  )
}

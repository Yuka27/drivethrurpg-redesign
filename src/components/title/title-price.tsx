import { useTranslation } from 'react-i18next'

import type { TitleCard } from '@/api/titles'
import { useFormatMoney } from '@/i18n/format'
import { cn } from '@/lib/utils'

/** The price; on sale, the old price struck through after it. */
export function TitlePrice({
  title,
  className,
}: {
  title: TitleCard
  className?: string
}) {
  const { t } = useTranslation('listing')
  const formatMoney = useFormatMoney()
  const was =
    title.onSale &&
    title.listPrice &&
    title.listPrice.amount > title.price.amount
      ? title.listPrice
      : null

  return (
    <p className={cn('flex items-baseline gap-1.5 font-bold', className)}>
      <span>
        {title.price.amount === 0 ? t('price.free') : formatMoney(title.price)}
      </span>
      {was && (
        <s className="text-xs font-normal text-muted-foreground">
          <span className="sr-only">{t('card.was')} </span>
          {formatMoney(was)}
        </s>
      )}
    </p>
  )
}

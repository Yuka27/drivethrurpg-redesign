import { StarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

/** Five 12px stars, `value` of them filled yellow, read out as `label`. */
export function Stars({
  value,
  label,
  className,
}: {
  value: number
  label: string
  className?: string
}) {
  const filled = Math.round(value)
  return (
    <span role="img" aria-label={label} className={cn('flex gap-1', className)}>
      {Array.from({ length: 5 }, (_, index) => (
        <StarIcon
          key={index}
          aria-hidden
          className={cn(
            'size-3',
            index < filled
              ? 'fill-warning text-warning'
              : 'fill-muted-foreground text-muted-foreground',
          )}
        />
      ))}
    </span>
  )
}

/**
 * Figma: the stars and the review count, "(240)" on cards, "(240 reviews)" in
 * list rows. Read out as one phrase.
 */
export function RatingStars({
  average,
  count,
  long = false,
}: {
  average: number
  count: number
  long?: boolean
}) {
  const { t } = useTranslation('listing')
  const formatNumber = useFormatNumber()
  const formatAverage = useFormatNumber({ maximumFractionDigits: 1 })

  return (
    <div className="flex items-center gap-1">
      <Stars
        value={average}
        label={t('rating.label', { average: formatAverage(average), count })}
      />
      <span aria-hidden className="text-xs text-muted-foreground">
        {long
          ? t('rating.reviews', { count, formatted: formatNumber(count) })
          : `(${formatNumber(count)})`}
      </span>
    </div>
  )
}

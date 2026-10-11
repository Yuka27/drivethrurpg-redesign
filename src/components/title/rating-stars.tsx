import { StarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

/**
 * Figma: five 12px stars (filled yellow, the rest grey) and the review count,
 * "(240)" on cards, "(240 reviews)" in list rows. Read out as one phrase.
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
  const filled = Math.round(average)

  return (
    <div className="flex items-center gap-1">
      <span
        role="img"
        aria-label={t('rating.label', {
          average: formatAverage(average),
          count,
        })}
        className="flex gap-1"
      >
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
      <span aria-hidden className="text-xs text-muted-foreground">
        {long
          ? t('rating.reviews', { count, formatted: formatNumber(count) })
          : `(${formatNumber(count)})`}
      </span>
    </div>
  )
}

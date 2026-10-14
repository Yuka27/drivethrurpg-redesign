import { useTranslation } from 'react-i18next'

import { PRICE_BANDS } from './listing-search'
import { useFormatNumber } from '@/i18n/format'
import { usePreferencesStore } from '@/stores/preferences'

/** "Free", "Under $5" (a band), "Up to $12.50" (typed in): a highest price in words. */
export function usePriceLabel() {
  const { t } = useTranslation('listing')
  const currency = usePreferencesStore((state) => state.currency)
  // "Under $5", not "$5.00"; cents only when there are some
  const whole = useFormatNumber({
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })
  const exact = useFormatNumber({ style: 'currency', currency })

  return (max: number) => {
    if (max === 0) return t('price.free')
    const price = Number.isInteger(max) ? whole(max) : exact(max)
    return PRICE_BANDS.includes(max as never)
      ? t('price.under', { price })
      : t('price.upTo', { price })
  }
}

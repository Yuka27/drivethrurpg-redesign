import { useMemo } from 'react'

import { apiLanguage } from './languages'
import type { Money } from '@/api/client'
import { usePreferencesStore } from '@/stores/preferences'

/**
 * Numbers, dates and money are formatted by the browser (Intl) in the current
 * language, never by translation files or string concatenation.
 */
function useLocale() {
  return apiLanguage(usePreferencesStore((state) => state.language))
}

/** Money amounts from the API are integer minor units (cents): 1999 = 19.99. */
export function useFormatMoney() {
  const locale = useLocale()
  return useMemo(() => {
    const formatters = new Map<string, Intl.NumberFormat>()
    return ({ amount, currency }: Money) => {
      let formatter = formatters.get(currency)
      if (!formatter) {
        formatter = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
        })
        formatters.set(currency, formatter)
      }
      const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
      return formatter.format(amount / 10 ** digits)
    }
  }, [locale])
}

export function useFormatNumber(options?: Intl.NumberFormatOptions) {
  const locale = useLocale()
  return useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, options)
    return (value: number) => formatter.format(value)
    // options is usually an inline literal: key on its content, not its identity
  }, [locale, JSON.stringify(options)])
}

export function useFormatDate(
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
) {
  const locale = useLocale()
  return useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, options)
    return (value: string | number | Date) => formatter.format(new Date(value))
  }, [locale, JSON.stringify(options)])
}

/** "pl" -> "Polish" (in English UI) / "polski" (in Polish UI), via Intl.DisplayNames. */
export function useLanguageName() {
  const locale = useLocale()
  return useMemo(() => {
    const names = new Intl.DisplayNames([locale], { type: 'language' })
    return (code: string) => names.of(code) ?? code
  }, [locale])
}

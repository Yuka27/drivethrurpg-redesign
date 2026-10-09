import { useTranslation } from 'react-i18next'

import { CompactSelect } from './compact-select'
import type { CompactSelectOption } from './compact-select'
import { useLocales } from '@/api/meta'
import { usePreferencesStore } from '@/stores/preferences'

/** "ENG" -> "Eng", as the desktop header shows it; the menu re-uppercases with CSS. */
const titleCase = (text: string) => text.charAt(0) + text.slice(1).toLowerCase()

export function CurrencySelect({ className }: { className?: string }) {
  const { t } = useTranslation()
  const currency = usePreferencesStore((state) => state.currency)
  const setCurrency = usePreferencesStore((state) => state.setCurrency)
  const { data } = useLocales()

  // until the list loads, offer just the current value so the trigger is never blank
  const options: Array<CompactSelectOption> = data
    ? data.currencies.map((c) => ({
        value: c.code,
        short: c.code,
        label: `${c.code} · ${c.label} (${c.symbol})`,
      }))
    : [{ value: currency, short: currency, label: currency }]

  return (
    <CompactSelect
      label={t('header.currency')}
      value={currency}
      options={options}
      onValueChange={setCurrency}
      className={className}
    />
  )
}

/** Trigger shows the short code (Eng/ENG); the list shows each language's own name. */
export function LanguageSelect({ className }: { className?: string }) {
  const { t } = useTranslation()
  const language = usePreferencesStore((state) => state.language)
  const setLanguage = usePreferencesStore((state) => state.setLanguage)
  const onValueChange = (code: string) => void setLanguage(code)
  const { data } = useLocales()

  const options: Array<CompactSelectOption> = data
    ? data.languages.map((l) => ({
        value: l.code,
        short: titleCase(l.short),
        label: l.label,
      }))
    : [{ value: language, short: titleCase(language), label: language }]

  return (
    <CompactSelect
      label={t('header.language')}
      value={language}
      options={options}
      onValueChange={onValueChange}
      className={className}
    />
  )
}

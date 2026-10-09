/** Languages the API lists (GET /meta/locales). Only some have UI translation files. */
export const SUPPORTED_LANGUAGES = ['en', 'pl', 'it', 'de', 'ja'] as const

/** Languages with files in src/locales; the rest fall back to English UI text. */
export const TRANSLATED_LANGUAGES = ['en', 'pl'] as const

export const DEFAULT_LANGUAGE = 'en'

/** Dev-only pseudo-locale (?lng=en-XA): accented, 30% longer, wrapped in [ ]. */
export const PSEUDO_LOCALE = 'en-XA'

/** "pl-PL" -> "pl"; null when the API does not offer the language. */
export function toSupportedLanguage(tag: string | null | undefined) {
  const base = tag?.toLowerCase().split(/[-_]/)[0]
  return SUPPORTED_LANGUAGES.find((language) => language === base) ?? null
}

/** The language code sent to the API and used for Intl formatting. */
export const apiLanguage = (language: string) =>
  language === PSEUDO_LOCALE ? DEFAULT_LANGUAGE : language

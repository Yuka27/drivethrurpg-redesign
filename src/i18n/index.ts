import i18n from 'i18next'
import resourcesToBackend from 'i18next-resources-to-backend'
import { initReactI18next } from 'react-i18next'

import {
  DEFAULT_LANGUAGE,
  PSEUDO_LOCALE,
  SUPPORTED_LANGUAGES,
} from './languages'
import { NAMESPACES, enResources } from './resources'

// Every non-English locale file, loaded on demand (one small chunk per file).
// Adding src/locales/de/*.json is enough to ship German UI text.
const lazyLocales = import.meta.glob<{ default: object }>([
  '../locales/*/*.json',
  '!../locales/en/*.json',
])

async function loadNamespace(language: string, namespace: string) {
  if (import.meta.env.DEV && language === PSEUDO_LOCALE) {
    const { pseudoResources } = await import('@/locales/en-XA/pseudo')
    return pseudoResources[namespace as keyof typeof pseudoResources]
  }
  const load = lazyLocales[`../locales/${language}/${namespace}.json`] as
    | (() => Promise<{ default: object }>)
    | undefined
  // no file (it, de, ja for now): empty resources, so every key falls back to English
  return load ? (await load()).default : {}
}

export async function initI18n(language: string) {
  await i18n
    .use(initReactI18next)
    .use(resourcesToBackend(loadNamespace))
    .init({
      lng: language,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: import.meta.env.DEV
        ? [...SUPPORTED_LANGUAGES, PSEUDO_LOCALE]
        : SUPPORTED_LANGUAGES,
      // don't also try "en" for "en-XA"
      load: 'currentOnly',
      resources: { [DEFAULT_LANGUAGE]: enResources },
      partialBundledLanguages: true,
      // namespaces are small; loading all of them with the language avoids a
      // flash of English when a page first uses its namespace
      ns: NAMESPACES,
      defaultNS: 'common',
      interpolation: { escapeValue: false },
      // main.tsx waits for init, and setLanguage waits for changeLanguage,
      // so text is always loaded before React renders it
      react: { useSuspense: false },
    })
  document.documentElement.lang = language
  return i18n
}

export { i18n }

import {
  DEFAULT_LANGUAGE,
  PSEUDO_LOCALE,
  toSupportedLanguage,
} from './languages'
import { usePreferencesStore } from '@/stores/preferences'

/**
 * Where the first-render language came from. Detection order:
 * saved choice -> account preference -> browser language -> API default.
 * The account preference and the API default need the network, so they are
 * applied after start-up by usePreferencesSync (src/api/preferences.ts).
 */
export type LanguageSource = 'pseudo' | 'saved' | 'browser' | 'fallback'

let initialSource: LanguageSource = 'fallback'
export const getInitialLanguageSource = () => initialSource

function detect(): { language: string; source: LanguageSource } {
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('lng') === PSEUDO_LOCALE
  ) {
    return { language: PSEUDO_LOCALE, source: 'pseudo' }
  }

  const { language, languageChosen } = usePreferencesStore.getState()
  if (languageChosen) return { language, source: 'saved' }

  for (const tag of navigator.languages) {
    const supported = toSupportedLanguage(tag)
    if (supported) return { language: supported, source: 'browser' }
  }

  return { language: DEFAULT_LANGUAGE, source: 'fallback' }
}

/** Synchronous part of detection, run once before the first render. */
export function detectInitialLanguage() {
  const result = detect()
  initialSource = result.source
  // the pseudo-locale is UI-only; API requests keep the stored language
  if (result.source === 'browser' || result.source === 'fallback') {
    usePreferencesStore.setState({ language: result.language })
  }
  return result.language
}

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { useMe } from './me'
import { useLocales } from './meta'
import { queryKeys } from './query-keys'
import { i18n } from '@/i18n'
import { getInitialLanguageSource } from '@/i18n/detect'
import { toSupportedLanguage } from '@/i18n/languages'
import { usePreferencesStore } from '@/stores/preferences'

/** Only the part of the account preferences the shell reads and edits. */
const AccountPreferencesSchema = z.object({
  content: z.object({
    currency: z.string(),
    language: z.string(),
    showAiGenerated: z.boolean(),
  }),
})

/** GET /account/preferences, only needed to detect the language of a logged-in user. */
function useAccountPreferences(enabled: boolean) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.account.preferences(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/account/preferences', {
        schema: AccountPreferencesSchema,
        prefs,
        signal,
      }),
    enabled,
    staleTime: Infinity,
  })
}

function useSaveContentPreferences() {
  return useMutation({
    mutationFn: ({
      currency,
      aiContent,
    }: {
      currency: string
      aiContent: boolean
    }) =>
      apiFetch('/account/preferences', {
        method: 'PATCH',
        body: { content: { currency, showAiGenerated: aiContent } },
        schema: AccountPreferencesSchema,
      }),
    onError: () =>
      toast.error(i18n.t('preferences.saveFailed'), {
        description: i18n.t('preferences.saveFailedDetail'),
      }),
  })
}

/**
 * Mount once (root route). Keeps the preferences store consistent with the API:
 * - language detection, network part: account preference (logged in), then the
 *   API default when neither a saved choice nor the browser language matched
 * - a currency/language the API no longer offers falls back to its default
 * - currency and AI changes of a logged-in user are saved to the account
 *   (language is saved by setLanguage itself)
 */
export function usePreferencesSync() {
  const { data: locales } = useLocales()
  const { data: me } = useMe()
  const loggedIn = Boolean(me)
  const languageChosen = usePreferencesStore((state) => state.languageChosen)
  const source = getInitialLanguageSource()
  const detecting = !languageChosen && source !== 'pseudo'

  const { data: accountPreferences } = useAccountPreferences(
    loggedIn && detecting,
  )
  const { mutate: save } = useSaveContentPreferences()

  // detection: the account preference beats the browser language
  useEffect(() => {
    const accountLanguage = toSupportedLanguage(
      accountPreferences?.content.language,
    )
    const { language, applyDetectedLanguage } = usePreferencesStore.getState()
    if (detecting && accountLanguage && accountLanguage !== language) {
      void applyDetectedLanguage(accountLanguage)
    }
  }, [accountPreferences, detecting])

  // the API default when nothing else matched, and a guard against languages
  // or currencies the API no longer offers
  useEffect(() => {
    if (!locales) return
    const { currency, language, setCurrency, applyDetectedLanguage } =
      usePreferencesStore.getState()
    if (!locales.currencies.some((c) => c.code === currency))
      setCurrency(locales.defaults.currency)
    const offered = locales.languages.some((l) => l.code === language)
    if (
      source !== 'pseudo' &&
      (!offered || (detecting && source === 'fallback' && !loggedIn)) &&
      language !== locales.defaults.language
    ) {
      void applyDetectedLanguage(locales.defaults.language)
    }
  }, [locales, detecting, source, loggedIn])

  useEffect(() => {
    if (!loggedIn) return
    return usePreferencesStore.subscribe((state, previous) => {
      if (
        state.currency !== previous.currency ||
        state.aiContent !== previous.aiContent
      ) {
        save(state)
      }
    })
  }, [loggedIn, save])
}

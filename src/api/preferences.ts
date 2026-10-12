import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
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
import { ThemeSchema, useThemeStore } from '@/stores/theme'

const flag = (fallback: boolean) => z.boolean().catch(fallback)

/**
 * GET /account/preferences, all groups. One schema for the one cache entry: the
 * shell (language detection) and the preferences page share it. Settings the
 * API does not return yet fall back to the defaults below; PATCH stores any of
 * them (the API merges groups).
 */
const AccountPreferencesSchema = z.object({
  email: z
    .object({
      /** marketing off: daily deals, review reminders, price drops */
      pauseMarketing: flag(false),
      dailyDeals: flag(true),
      reviewReminders: flag(true),
      wishlistPriceDrops: flag(true),
      libraryFileUpdates: flag(true),
      /** publishers may use the buyer's email for their own marketing */
      publisherContact: flag(false),
    })
    .catch({
      pauseMarketing: false,
      dailyDeals: true,
      reviewReminders: true,
      wishlistPriceDrops: true,
      libraryFileUpdates: true,
      publisherContact: false,
    }),
  notifications: z
    .object({ publisherUpdates: flag(false) })
    .catch({ publisherUpdates: false }),
  downloads: z
    .object({ saveTo: z.enum(['device', 'ask']).catch('device') })
    .catch({ saveTo: 'device' }),
  content: z.object({
    currency: z.string(),
    language: z.string(),
    showAiGenerated: z.boolean(),
    showAdult: flag(false),
  }),
  /** theme is absent until a logged-in user first picks one */
  display: z
    .object({ theme: ThemeSchema.optional().catch(undefined) })
    .catch({}),
})
export type AccountPreferences = z.infer<typeof AccountPreferencesSchema>

/** The groups the preferences page edits (content language, currency and AI go through the store). */
export type PreferencesPatch = {
  email?: Partial<AccountPreferences['email']>
  notifications?: Partial<AccountPreferences['notifications']>
  downloads?: Partial<AccountPreferences['downloads']>
  content?: Partial<Pick<AccountPreferences['content'], 'showAdult'>>
  display?: AccountPreferences['display']
}

/** GET /account/preferences (detection reads the language; the preferences page reads the rest). */
export function useAccountPreferences(enabled = true) {
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

/**
 * PATCH /account/preferences, saved as soon as a setting changes. The cache
 * updates first so the switch moves at once; a failure puts it back and says so.
 */
export function useUpdateAccountPreferences() {
  const queryClient = useQueryClient()
  // every cached copy (one per request-preferences key)
  const key = ['account', 'preferences']
  return useMutation({
    mutationFn: (patch: PreferencesPatch) =>
      apiFetch('/account/preferences', {
        method: 'PATCH',
        body: patch,
        schema: AccountPreferencesSchema,
      }),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueriesData<AccountPreferences>({
        queryKey: key,
      })
      queryClient.setQueriesData<AccountPreferences>(
        { queryKey: key },
        (current) =>
          current && {
            ...current,
            email: { ...current.email, ...patch.email },
            notifications: { ...current.notifications, ...patch.notifications },
            downloads: { ...current.downloads, ...patch.downloads },
            content: { ...current.content, ...patch.content },
            display: { ...current.display, ...patch.display },
          },
      )
      return { previous }
    },
    onError: (_error, _patch, context) => {
      context?.previous.forEach(([queryKey, data]) =>
        queryClient.setQueryData(queryKey, data),
      )
      toast.error(i18n.t('preferences.saveFailed'))
    },
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
 * - theme: a guest's stays on this device; a logged-in user's is saved to the
 *   account and applied on every device they log in on
 */
export function usePreferencesSync() {
  const { data: locales } = useLocales()
  const { data: me } = useMe()
  const loggedIn = Boolean(me)
  const languageChosen = usePreferencesStore((state) => state.languageChosen)
  const source = getInitialLanguageSource()
  const detecting = !languageChosen && source !== 'pseudo'

  const { data: accountPreferences } = useAccountPreferences(loggedIn)
  const { mutate: save } = useSaveContentPreferences()
  const { mutate: update } = useUpdateAccountPreferences()
  const accountTheme = accountPreferences?.display.theme

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

  // theme, account to device: once per login, so a later refetch (or a failed
  // save putting the cache back) never overrides what the user just picked
  const themeAppliedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!me) {
      themeAppliedFor.current = null
      return
    }
    if (!accountTheme || themeAppliedFor.current === me.id) return
    themeAppliedFor.current = me.id
    const { theme, setTheme } = useThemeStore.getState()
    if (accountTheme !== theme) setTheme(accountTheme)
  }, [me, accountTheme])

  // theme, device to account: logged-in users only; never echo the theme the
  // account itself just applied
  const savedTheme = useRef(accountTheme)
  savedTheme.current = accountTheme
  useEffect(() => {
    if (!loggedIn) return
    return useThemeStore.subscribe((state, previous) => {
      if (
        state.theme !== previous.theme &&
        state.theme !== savedTheme.current
      ) {
        update({ display: { theme: state.theme } })
      }
    })
  }, [loggedIn, update])
}

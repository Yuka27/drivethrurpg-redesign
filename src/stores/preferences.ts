import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { apiFetch } from '@/api/client'
import { keyLanguage } from '@/api/query-keys'
import { i18n } from '@/i18n'
import { queryClient } from '@/lib/query-client'
import { safeLocalStorage } from '@/lib/safe-storage'

// Defaults match the API's GET /meta/locales "defaults"
const DEFAULTS = {
  currency: 'USD',
  language: 'en',
  aiContent: false,
  languageChosen: false,
}

/**
 * Each field falls back on its own, so one bad value in storage
 * does not wipe the others.
 */
const StoredPreferencesSchema = z.object({
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .catch(DEFAULTS.currency),
  language: z
    .string()
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .catch(DEFAULTS.language),
  aiContent: z.boolean().catch(DEFAULTS.aiContent),
  /** false until the user picks a language; until then it is re-detected on every visit */
  languageChosen: z.boolean().catch(DEFAULTS.languageChosen),
})

/** The values that change API responses (sent as headers, part of query keys). */
export type Preferences = Pick<
  z.infer<typeof StoredPreferencesSchema>,
  'currency' | 'language' | 'aiContent'
>

type PreferencesState = z.infer<typeof StoredPreferencesSchema> & {
  setCurrency: (currency: string) => void
  setAiContent: (aiContent: boolean) => void
  /** The user picked a language: switch, remember it, save it to the account, refetch content. */
  setLanguage: (language: string) => Promise<void>
  /** Detection picked a language (account, browser, API default): switch without remembering it as a choice. */
  applyDetectedLanguage: (language: string) => Promise<void>
}

/**
 * Refetch content for the new language. Entries keyed to another language are left
 * alone: right after the switch React still observes them (it re-renders with the new
 * keys a moment later), so refetching them would re-download old-language content.
 * They stay cached, correct for their language, in case the user switches back.
 */
const refetchForLanguage = (language: string) =>
  queryClient.invalidateQueries({
    predicate: (query) => {
      const built = keyLanguage(query.queryKey)
      return built === undefined || built === language
    },
  })

const isLoggedIn = () =>
  queryClient
    .getQueriesData<unknown>({ queryKey: ['me'] })
    .some(([, user]) => Boolean(user))

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setCurrency: (currency) => set({ currency }),
      setAiContent: (aiContent) => set({ aiContent }),

      setLanguage: async (language) => {
        await i18n.changeLanguage(language)
        document.documentElement.lang = language
        set({ language, languageChosen: true })
        if (isLoggedIn()) {
          apiFetch('/account/preferences', {
            method: 'PATCH',
            body: { content: { language } },
            schema: z.unknown(),
          }).catch(() => {
            // the choice still applies on this device
          })
        }
        await refetchForLanguage(language)
      },

      applyDetectedLanguage: async (language) => {
        await i18n.changeLanguage(language)
        document.documentElement.lang = language
        set({ language })
        await refetchForLanguage(language)
      },
    }),
    {
      name: 'dtrpg-preferences',
      version: 2,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ currency, language, aiContent, languageChosen }) => ({
        currency,
        language,
        aiContent,
        languageChosen,
      }),
      // validate what comes back from storage instead of trusting it
      merge: (persisted, current) => ({
        ...current,
        ...StoredPreferencesSchema.catch(DEFAULTS).parse(persisted ?? {}),
      }),
      // v1 always stored a language (default "en"), so only a non-default one proves a choice
      migrate: (persisted, version) =>
        version < 2 && persisted && typeof persisted === 'object'
          ? {
              ...persisted,
              languageChosen:
                'language' in persisted &&
                persisted.language !== DEFAULTS.language,
            }
          : persisted,
    },
  ),
)

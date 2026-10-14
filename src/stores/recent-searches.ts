import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { safeLocalStorage } from '@/lib/safe-storage'

/** The last few, newest first. */
const KEEP = 5

/**
 * What this device searched for, for the search panel. Kept on the device
 * only: there is no API for it.
 */
export const useRecentSearches = create<{
  queries: Array<string>
  add: (query: string) => void
  remove: (query: string) => void
  clear: () => void
}>()(
  persist(
    (set) => ({
      queries: [],
      add: (query) =>
        set(({ queries }) => {
          const q = query.trim()
          if (!q) return { queries }
          return {
            queries: [
              q,
              ...queries.filter(
                (item) => item.toLocaleLowerCase() !== q.toLocaleLowerCase(),
              ),
            ].slice(0, KEEP),
          }
        }),
      remove: (query) =>
        set(({ queries }) => ({
          queries: queries.filter((item) => item !== query),
        })),
      clear: () => set({ queries: [] }),
    }),
    {
      name: 'dtrpg-recent-searches',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ queries }) => ({ queries }),
      // validate what comes back from storage instead of trusting it
      merge: (persisted, current) => ({
        ...current,
        queries: z
          .object({ queries: z.array(z.string()).max(KEEP) })
          .catch({ queries: [] })
          .parse(persisted ?? {}).queries,
      }),
    },
  ),
)

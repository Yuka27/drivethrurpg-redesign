import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { safeLocalStorage } from '@/lib/safe-storage'

/** The last few, newest first. */
const KEEP = 10

const ViewedSchema = z.object({
  id: z.string(),
  title: z.string(),
  coverUrl: z.string().nullable(),
})
export type ViewedTitle = z.infer<typeof ViewedSchema>

/**
 * Titles opened on this device (the product page records them). Kept on the
 * device only: there is no API for it, and it is a convenience, not account data.
 */
export const useRecentlyViewed = create<{
  titles: Array<ViewedTitle>
  record: (title: ViewedTitle) => void
  /** forget them all ("Clear"); `restore` puts them back (Undo) */
  clear: () => void
  restore: (titles: Array<ViewedTitle>) => void
}>()(
  persist(
    (set) => ({
      titles: [],
      record: (title) =>
        set(({ titles }) => ({
          titles: [
            title,
            ...titles.filter((item) => item.id !== title.id),
          ].slice(0, KEEP),
        })),
      clear: () => set({ titles: [] }),
      restore: (titles) => set({ titles: titles.slice(0, KEEP) }),
    }),
    {
      name: 'dtrpg-recently-viewed',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ titles }) => ({ titles }),
      // validate what comes back from storage instead of trusting it
      merge: (persisted, current) => ({
        ...current,
        titles: z
          .object({ titles: z.array(ViewedSchema).max(KEEP) })
          .catch({ titles: [] })
          .parse(persisted ?? {}).titles,
      }),
    },
  ),
)

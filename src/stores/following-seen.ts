import { z } from 'zod'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { safeLocalStorage } from '@/lib/safe-storage'

/**
 * The newest release each user has seen in home's "Following" tab (an ISO
 * date, per user id), so the tab can mark newer ones. Kept on the device:
 * the API has no "seen" state for the feed.
 */
export const useFollowingSeen = create<{
  seen: Record<string, string>
  markSeen: (userId: string, latest: string) => void
}>()(
  persist(
    (set) => ({
      seen: {},
      markSeen: (userId, latest) =>
        set(({ seen }) =>
          seen[userId] === latest
            ? { seen }
            : { seen: { ...seen, [userId]: latest } },
        ),
    }),
    {
      name: 'dtrpg-following-seen',
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: ({ seen }) => ({ seen }),
      // validate what comes back from storage instead of trusting it
      merge: (persisted, current) => ({
        ...current,
        seen: z
          .object({ seen: z.record(z.string(), z.string()) })
          .catch({ seen: {} })
          .parse(persisted ?? {}).seen,
      }),
    },
  ),
)

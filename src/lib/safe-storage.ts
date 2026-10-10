/** Synchronous storage that never throws (also satisfies zustand's StateStorage). */
export type SafeStorage = {
  getItem: (name: string) => string | null
  setItem: (name: string, value: string) => void
  removeItem: (name: string) => void
}

/**
 * Web Storage that never throws: private windows, blocked site data and a full
 * quota all degrade to "nothing stored" instead of breaking the app.
 */
function createSafeStorage(getStorage: () => Storage): SafeStorage {
  return {
    getItem: (name) => {
      try {
        return getStorage().getItem(name)
      } catch {
        return null
      }
    },
    setItem: (name, value) => {
      try {
        getStorage().setItem(name, value)
      } catch {
        // storage unavailable: keep the value in memory only
      }
    },
    removeItem: (name) => {
      try {
        getStorage().removeItem(name)
      } catch {
        // storage unavailable
      }
    },
  }
}

export const safeLocalStorage = createSafeStorage(() => localStorage)
export const safeSessionStorage = createSafeStorage(() => sessionStorage)

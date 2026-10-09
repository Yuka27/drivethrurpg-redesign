import type { StateStorage } from 'zustand/middleware'

/**
 * localStorage that never throws: private windows, blocked site data and a full
 * quota all degrade to "nothing stored" instead of breaking the app.
 */
export const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      // storage unavailable: keep the value in memory only
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      // storage unavailable
    }
  },
}

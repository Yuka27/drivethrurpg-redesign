import { z } from 'zod'
import { create } from 'zustand'

import { safeLocalStorage } from '@/lib/safe-storage'

export const ThemeSchema = z.enum(['dark', 'light', 'system'])
export type Theme = z.infer<typeof ThemeSchema>
export type ResolvedTheme = Exclude<Theme, 'system'>

// Stored as a plain string (not zustand's JSON envelope) because the
// no-flash script in index.html reads it before React loads.
const STORAGE_KEY = 'dtrpg-theme'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

const resolve = (theme: Theme): ResolvedTheme =>
  theme === 'system' ? (darkQuery.matches ? 'dark' : 'light') : theme

const apply = (resolved: ResolvedTheme) =>
  document.documentElement.classList.toggle('dark', resolved === 'dark')

// anything unexpected in storage (old values, manual edits) falls back to dark
const initialTheme = ThemeSchema.catch('dark').parse(
  safeLocalStorage.getItem(STORAGE_KEY),
)

type ThemeState = {
  theme: Theme
  /** what is actually on screen: "system" resolved against the OS setting */
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: initialTheme,
  resolvedTheme: resolve(initialTheme),
  setTheme: (theme) => {
    safeLocalStorage.setItem(STORAGE_KEY, theme)
    set({ theme, resolvedTheme: resolve(theme) })
  },
}))

// keep <html class="dark"> in sync with the store, and follow the OS while on "system"
apply(useThemeStore.getState().resolvedTheme)
useThemeStore.subscribe((state) => apply(state.resolvedTheme))
darkQuery.addEventListener('change', () => {
  const { theme } = useThemeStore.getState()
  if (theme === 'system')
    useThemeStore.setState({ resolvedTheme: resolve(theme) })
})

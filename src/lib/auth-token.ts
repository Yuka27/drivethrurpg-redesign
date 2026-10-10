import { safeLocalStorage, safeSessionStorage } from './safe-storage'

/**
 * The API's bearer token (returned in the body of login, register and social sign-in).
 *
 * - Requests read it from memory; apiFetch sends it as `Authorization: Bearer …`.
 * - "Remember me" keeps it in localStorage (survives restarts); otherwise in
 *   sessionStorage (gone when the tab closes).
 * - It is cleared on logout and whenever an authenticated request gets a 401.
 *
 * Web Storage is readable by any script on the page, so a successful XSS could
 * read it; the CSP and React's escaping are the defence. When the backend offers
 * it, the stronger setup is an HttpOnly refresh cookie plus a memory-only access
 * token — only this module would change.
 */
const STORAGE_KEY = 'dtrpg-auth-token'

let token: string | null =
  safeLocalStorage.getItem(STORAGE_KEY) ??
  safeSessionStorage.getItem(STORAGE_KEY)

type Listener = (
  token: string | null,
  change: { fromOtherTab: boolean },
) => void
const listeners = new Set<Listener>()
const notify = (fromOtherTab = false) =>
  listeners.forEach((listener) => listener(token, { fromOtherTab }))

export const getAuthToken = () => token

export function setAuthToken(
  value: string,
  { remember }: { remember: boolean },
) {
  token = value
  // keep exactly one copy, in the storage that matches the user's choice
  safeLocalStorage.removeItem(STORAGE_KEY)
  safeSessionStorage.removeItem(STORAGE_KEY)
  ;(remember ? safeLocalStorage : safeSessionStorage).setItem(
    STORAGE_KEY,
    value,
  )
  notify()
}

export function clearAuthToken() {
  if (token === null) return
  token = null
  safeLocalStorage.removeItem(STORAGE_KEY)
  safeSessionStorage.removeItem(STORAGE_KEY)
  notify()
}

/** Called when the token changes in this tab or (remembered sessions) in another tab. */
export function subscribeAuthToken(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// logging in or out in another tab updates this one (localStorage only fires there)
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return
  token = event.newValue ?? safeSessionStorage.getItem(STORAGE_KEY)
  notify(true)
})

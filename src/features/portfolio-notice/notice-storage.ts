/**
 * What the visitor chose about the portfolio notice. "Don't show this again":
 * the notice stays away (localStorage) until NOTICE_VERSION goes up. Any other
 * dismissal: away for this browser session (sessionStorage). Storage that
 * throws (private mode, blocked site data) counts as nothing stored, so the
 * notice then shows once per page load (the store remembers the rest).
 */
export const NOTICE_KEY = 'dtrpg-portfolio-notice'
export const NOTICE_SESSION_KEY = 'dtrpg-portfolio-notice-session'
/** Bump to show the notice to everyone again, "don't show again" included. */
export const NOTICE_VERSION = 1

type Saved = { version: number; hidden: boolean }

const read = (storage: () => Storage, key: string) => {
  try {
    return storage().getItem(key)
  } catch {
    return null
  }
}
const write = (storage: () => Storage, key: string, value: string | null) => {
  try {
    if (value === null) storage().removeItem(key)
    else storage().setItem(key, value)
  } catch {
    // storage unavailable: the in-memory flag in the store still holds
  }
}

const saved = (): Saved | null => {
  try {
    const value: unknown = JSON.parse(
      read(() => localStorage, NOTICE_KEY) ?? '',
    )
    return value &&
      typeof value === 'object' &&
      'version' in value &&
      typeof value.version === 'number'
      ? {
          version: value.version,
          hidden: 'hidden' in value && value.hidden === true,
        }
      : null
  } catch {
    return null
  }
}

/** "Don't show this again" was chosen for the current version. */
export const hiddenForever = () => {
  const choice = saved()
  return choice?.version === NOTICE_VERSION && choice.hidden
}

/** Whether a first visit (or a new session) should see the notice. */
export const shouldShowNotice = () =>
  !hiddenForever() &&
  read(() => sessionStorage, NOTICE_SESSION_KEY) !== String(NOTICE_VERSION)

/** Remember a dismissal: for the session, and for good when asked to. */
export function rememberDismissal(forever: boolean) {
  write(() => sessionStorage, NOTICE_SESSION_KEY, String(NOTICE_VERSION))
  write(
    () => localStorage,
    NOTICE_KEY,
    forever
      ? JSON.stringify({
          version: NOTICE_VERSION,
          hidden: true,
        } satisfies Saved)
      : null,
  )
}

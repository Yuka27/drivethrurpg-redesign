import { useCallback, useSyncExternalStore } from 'react'

/**
 * Whether a media query matches, kept up to date. For behaviour that differs
 * by screen (how many chips to show); layout differences belong in CSS.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Tailwind's `lg` breakpoint, where the desktop layouts start. */
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')

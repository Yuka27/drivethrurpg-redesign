import { useMediaQuery } from './use-media-query'

/** True when the user asked the OS for less motion; skip JS-driven animations then. */
export const useReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)')

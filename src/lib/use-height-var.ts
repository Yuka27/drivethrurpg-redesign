import { useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Keeps a CSS variable on <html> equal to an element's height in px (e.g.
 * `--header-h` for the sticky site header), so other sticky parts can stack
 * under it and sections can scroll clear of it. Removed again on unmount.
 */
export function useHeightVar(
  ref: RefObject<HTMLElement | null>,
  name: `--${string}`,
) {
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const root = document.documentElement
    const measure = () =>
      root.style.setProperty(name, `${element.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => {
      observer.disconnect()
      root.style.removeProperty(name)
    }
  }, [ref, name])
}

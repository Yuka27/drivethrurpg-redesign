import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/** The sticky header's height (set by the shell), 0 when there is none. */
export const headerHeight = () =>
  parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
  ) || 0

/**
 * The product bar slides in once the title block has gone. True
 * when the page's <h1> no longer shows below the sticky part (the site header
 * plus the breadcrumb row, `rowHeight`) and has left upwards, not downwards.
 * An IntersectionObserver whose top edge is that sticky line, no scroll events.
 */
export function useBarVisibility(
  headingRef: RefObject<HTMLElement | null>,
  rowHeight: number,
) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const heading = headingRef.current
    if (!heading) return
    const line = headerHeight() + rowHeight
    const observer = new IntersectionObserver(
      ([entry]) => {
        const top = entry.rootBounds?.top ?? line
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < top)
      },
      // the viewport, minus what the sticky parts cover at its top
      { rootMargin: `-${Math.round(line)}px 0px 0px 0px`, threshold: 0 },
    )
    observer.observe(heading)
    return () => observer.disconnect()
  }, [headingRef, rowHeight])

  return visible
}

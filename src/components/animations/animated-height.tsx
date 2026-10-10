import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type AnimatedHeightProps = {
  children: ReactNode
  /**
   * Hold the current height and ignore content changes (e.g. hidden content
   * re-wrapping while its container is resized); unfreezing animates to fit.
   */
  frozen?: boolean
  className?: string
}

/**
 * Animates its height to fit its content whenever the content changes size
 * (height: auto cannot be transitioned in CSS). The first size is applied
 * without animation; reduced motion turns the transition off.
 */
export function AnimatedHeight({
  children,
  frozen = false,
  className,
}: AnimatedHeightProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const frozenRef = useRef(frozen)
  const [height, setHeight] = useState<number>()
  const [ready, setReady] = useState(false)

  useLayoutEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    setHeight(inner.offsetHeight)
    const observer = new ResizeObserver(() => {
      if (!frozenRef.current) setHeight(inner.offsetHeight)
    })
    observer.observe(inner)
    // animate only changes after the first, measured frame
    const frame = requestAnimationFrame(() => setReady(true))
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  // on unfreeze, catch up with whatever the content became meanwhile
  useLayoutEffect(() => {
    frozenRef.current = frozen
    if (!frozen && innerRef.current) setHeight(innerRef.current.offsetHeight)
  }, [frozen])

  return (
    <div
      style={{ height }}
      className={cn(
        'overflow-hidden',
        ready &&
          'motion-safe:transition-[height] motion-safe:duration-250 motion-safe:ease-out',
        className,
      )}
    >
      <div ref={innerRef}>{children}</div>
    </div>
  )
}

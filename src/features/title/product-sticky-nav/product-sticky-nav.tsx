import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, RefObject } from 'react'

import { BreadcrumbRow } from './breadcrumb-row'
import { ProductBar } from './product-bar'
import { useBarVisibility } from './use-bar-visibility'
import type { Section } from './use-scroll-spy'
import type { Edition, TitleDetail } from '@/api/titles'

/**
 * The product page's sticky secondary menu (prototype:
 * docs/drivethrurpg-product-sticky-menu-dark.html), stuck right under the
 * site header (`--header-h`). Row 1, the breadcrumb and utility menus, is
 * always there; row 2, the product bar, slides open below it once the page's
 * <h1> has scrolled away. Sets `--stick-h` to the block's full height, which
 * the sections use for their scroll-margin-top.
 */
export function ProductStickyNav({
  title,
  edition,
  owned,
  headingRef,
  edgeRef,
  active,
  onSectionClick,
}: {
  title: TitleDetail
  edition: Edition | undefined
  owned: boolean
  /** the page's <h1>: the bar shows once it has gone */
  headingRef: RefObject<HTMLElement | null>
  /** the bar's outer box, for the scroll-spy's line */
  edgeRef: RefObject<HTMLDivElement | null>
  active: Section
  onSectionClick: (id: Section) => (event: MouseEvent) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [rowHeight, setRowHeight] = useState(0)
  const visible = useBarVisibility(headingRef, rowHeight)

  // --stick-h: the row plus the bar at full height (the bar's content keeps
  // its size while the bar is closed), so a section scrolled to lands clear
  // of the bar that will have opened by the time it gets there
  useEffect(() => {
    const row = rowRef.current
    const bar = barRef.current
    if (!row || !bar) return
    const root = document.documentElement
    const measure = () => {
      setRowHeight(row.offsetHeight)
      // + 1: the bar's bottom border
      root.style.setProperty(
        '--stick-h',
        `${row.offsetHeight + bar.offsetHeight + 1}px`,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(row)
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--stick-h')
    }
  }, [])

  return (
    <div className="sticky top-[var(--header-h,0px)] z-30">
      <div
        ref={rowRef}
        className="border-b bg-background/94 backdrop-blur-[10px]"
      >
        <BreadcrumbRow title={title} />
      </div>
      <ProductBar
        title={title}
        edition={edition}
        owned={owned}
        visible={visible}
        active={active}
        onSectionClick={onSectionClick}
        edgeRef={edgeRef}
        innerRef={barRef}
      />
    </div>
  )
}

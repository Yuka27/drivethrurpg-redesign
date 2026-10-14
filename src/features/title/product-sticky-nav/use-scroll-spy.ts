import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { MouseEvent, RefObject } from 'react'

import { useReducedMotion } from '@/lib/use-reduced-motion'

export const SECTIONS = ['overview', 'details', 'reviews'] as const
export type Section = (typeof SECTIONS)[number]

/** A section counts once its top is this far under the sticky block. */
const SLACK = 24

/**
 * The section being read: the last one whose top has passed the sticky
 * block's bottom edge (`edgeRef`, the bar's lower edge) plus 24px; the last
 * section at the very bottom of the page, where it may never get that high.
 * A scroll handler throttled to one check per frame: IntersectionObservers
 * would need a band at a line that moves while the bar slides in.
 */
export function useScrollSpy(edgeRef: RefObject<HTMLElement | null>) {
  const [active, setActive] = useState<Section>(SECTIONS[0])

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const line =
        (edgeRef.current?.getBoundingClientRect().bottom ?? 0) + SLACK
      let current: Section = SECTIONS[0]
      for (const id of SECTIONS) {
        const section = document.getElementById(id)
        if (section && section.getBoundingClientRect().top <= line) current = id
      }
      const root = document.documentElement
      if (window.scrollY + window.innerHeight >= root.scrollHeight - 4)
        current = SECTIONS[SECTIONS.length - 1]
      setActive(current)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [edgeRef])

  return active
}

/**
 * Scrolls a section into view (smoothly, unless the user asked for less
 * motion), clear of the sticky block through its scroll-margin-top, and puts
 * its hash in the URL without the browser jumping there.
 */
export function useScrollToSection() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()

  const scrollTo = (id: Section, smooth = true) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: smooth && !reduced ? 'smooth' : 'auto',
      block: 'start',
    })
  }

  const onSectionClick = (id: Section) => (event: MouseEvent) => {
    event.preventDefault()
    scrollTo(id)
    void navigate({
      to: '.',
      hash: id,
      replace: true,
      resetScroll: false,
      hashScrollIntoView: false,
    })
  }

  return { scrollTo, onSectionClick }
}

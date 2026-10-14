import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import { useHomeHero } from '@/api/titles'
import type { Banner, HeroOptions } from '@/api/titles'
import { AppAnchor } from '@/components/site/app-anchor'
import { IconTooltip } from '@/components/site/icon-tooltip'
import { LoadingStatus } from '@/components/site/loading-status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { cn } from '@/lib/utils'

/** A swipe this long (px) turns the slide. */
const SWIPE = 40
const DEFAULT_INTERVAL = 6000

/** The home page's hero: GET /home `hero` as a carousel. Its outline while it loads, nothing when it fails. */
export function HeroCarousel() {
  const hero = useHomeHero()
  if (hero.isPending) return <HeroSkeleton />
  if (!hero.data?.slides.length) return null
  return <Carousel slides={hero.data.slides} options={hero.data.options} />
}

/**
 * The APG carousel: a region of "n of N" slide groups, previous/next buttons
 * (shown on hover and focus, always on touch screens), a dot per slide and,
 * when it plays, a pause/play button. Autoplay stops on hover and while focus
 * is inside (but on the pause/play button, so Play plays), and never starts
 * under reduced motion. ← → move while it has focus; a swipe moves on touch.
 */
function Carousel({
  slides,
  options,
}: {
  slides: Array<Banner>
  options: HeroOptions | null
}) {
  const { t } = useTranslation('home')
  const reducedMotion = useReducedMotion()
  const regionRef = useRef<HTMLElement>(null)
  const slidesRef = useRef<HTMLDivElement>(null)
  const rotationRef = useRef<HTMLButtonElement>(null)
  const swipeFrom = useRef<number | null>(null)
  const [index, setIndex] = useState(0)
  // the pause button; hover and focus pause on their own
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const total = slides.length
  const current = slides[Math.min(index, total - 1)]
  const canPlay = Boolean(options?.autoplay) && total > 1 && !reducedMotion
  const playing =
    canPlay &&
    !paused &&
    !focused &&
    !(hovered && (options?.pauseOnHover ?? true))
  const delay = current.autoplayMs ?? options?.intervalMs ?? DEFAULT_INTERVAL

  useEffect(() => {
    if (!playing) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % total), delay)
    return () => clearTimeout(timer)
  }, [playing, index, delay, total])

  const go = (next: number) => setIndex(((next % total) + total) % total)

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    go(index + (event.key === 'ArrowLeft' ? -1 : 1))
    // the slide that had focus is about to go inert: keep focus in the carousel
    if (slidesRef.current?.contains(document.activeElement))
      regionRef.current?.focus()
  }
  const onFocus = (event: FocusEvent) =>
    setFocused(event.target !== rotationRef.current)
  const onBlur = (event: FocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
  }
  const onPointerDown = (event: PointerEvent) => {
    swipeFrom.current = event.pointerType === 'mouse' ? null : event.clientX
  }
  const onPointerUp = (event: PointerEvent) => {
    if (swipeFrom.current === null) return
    const distance = event.clientX - swipeFrom.current
    swipeFrom.current = null
    if (Math.abs(distance) >= SWIPE) go(index + (distance < 0 ? 1 : -1))
  }

  const arrowClass =
    'pointer-events-auto absolute top-1/2 size-10 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 text-white opacity-0 transition-opacity group-hover/hero:opacity-100 group-focus-within/hero:opacity-100 pointer-coarse:opacity-100 hover:bg-black/80 hover:text-white focus-visible:opacity-100 motion-reduce:transition-none'

  return (
    <section
      ref={regionRef}
      role="region"
      aria-roledescription={t('hero.carousel')}
      aria-label={t('hero.label')}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group/hero relative flex flex-col gap-3 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div
        ref={slidesRef}
        // announce a slide the user turned to, not every autoplay turn
        aria-live={playing ? 'off' : 'polite'}
        onPointerDown={total > 1 ? onPointerDown : undefined}
        onPointerUp={total > 1 ? onPointerUp : undefined}
        onPointerCancel={() => (swipeFrom.current = null)}
        className="grid touch-pan-y [grid-template-areas:'stack']"
      >
        {slides.map((slide, position) => {
          const active = position === index
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription={t('hero.slideRole')}
              aria-label={t('hero.slide', {
                index: position + 1,
                total,
              })}
              inert={!active}
              className={cn(
                'transition-opacity duration-500 [grid-area:stack] motion-reduce:transition-none',
                active ? 'opacity-100' : 'pointer-events-none opacity-0',
              )}
            >
              <HeroSlide slide={slide} />
            </div>
          )
        })}
      </div>

      {total > 1 && (
        <>
          {/* over the image, whatever the copy's height on phones */}
          <div className="pointer-events-none absolute inset-x-0 top-0 aspect-[3/1]">
            <IconTooltip label={t('hero.previous')}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('hero.previous')}
                onClick={() => go(index - 1)}
                className={cn(arrowClass, 'left-3')}
              >
                <ChevronLeftIcon aria-hidden className="size-5" />
              </Button>
            </IconTooltip>
            <IconTooltip label={t('hero.next')}>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('hero.next')}
                onClick={() => go(index + 1)}
                className={cn(arrowClass, 'right-3')}
              >
                <ChevronRightIcon aria-hidden className="size-5" />
              </Button>
            </IconTooltip>
          </div>

          <div className="flex items-center justify-center gap-2">
            {canPlay && (
              <IconTooltip
                label={t(paused ? 'hero.play' : 'hero.pause')}
                side="top"
              >
                <Button
                  ref={rotationRef}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t(paused ? 'hero.play' : 'hero.pause')}
                  onClick={() => setPaused((value) => !value)}
                  className="size-8 rounded-full"
                >
                  {paused ? (
                    <PlayIcon aria-hidden className="size-4" />
                  ) : (
                    <PauseIcon aria-hidden className="size-4" />
                  )}
                </Button>
              </IconTooltip>
            )}
            <div
              role="group"
              aria-label={t('hero.slides')}
              className="flex items-center"
            >
              {slides.map((slide, position) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={t('hero.goTo', {
                    index: position + 1,
                    title: slide.title,
                  })}
                  aria-current={position === index ? 'true' : undefined}
                  onClick={() => go(position)}
                  // a 24px target around an 8px dot
                  className="group/dot grid size-6 place-items-center rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'block h-2 rounded-full transition-all motion-reduce:transition-none',
                      position === index
                        ? 'w-5 bg-primary'
                        : 'w-2 bg-muted-foreground/60 group-hover/dot:bg-foreground',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

/**
 * One slide: the 3:1 image (the 2:1 art, cropped) with the copy on the API's `contentSide` over a
 * gradient from that edge (desktop), or the copy under the image, which fades
 * into it full width (phones).
 */
export function HeroSlide({ slide }: { slide: Banner }) {
  const { t } = useTranslation('home')
  const right = slide.contentSide === 'right'

  return (
    <div
      data-content-side={slide.contentSide}
      className="relative flex flex-col overflow-hidden rounded-xl border border-muted bg-black"
    >
      <div className="relative aspect-[3/1] w-full">
        {slide.image && (
          <img
            src={assetUrl(slide.image.url)}
            alt={slide.image.alt || slide.title}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black to-transparent to-45% lg:hidden"
        />
      </div>
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 from-black/90 from-25% to-transparent to-60% max-lg:hidden',
          right ? 'bg-linear-to-l' : 'bg-linear-to-r',
        )}
      />
      {/* always over black: the dark theme's colours, in both themes */}
      <div
        className={cn(
          'dark flex flex-col gap-3 px-4 pb-4 lg:absolute lg:inset-y-0 lg:w-1/2 lg:justify-center lg:gap-4 lg:px-16 lg:pb-0',
          right
            ? 'lg:right-0 lg:items-end lg:text-right'
            : 'lg:left-0 lg:items-start lg:text-left',
        )}
      >
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-primary-text uppercase">
            {t('hero.label')}
          </p>
          <h2 className="font-sans text-2xl leading-8 font-bold text-white lg:text-4xl lg:leading-10">
            {slide.title}
          </h2>
        </div>
        {slide.subtitle && (
          <p className="text-base text-white/90 lg:text-lg">{slide.subtitle}</p>
        )}
        <Button asChild className="h-9 self-start rounded-lg px-3 lg:self-auto">
          <AppAnchor href={slide.link}>{slide.cta}</AppAnchor>
        </Button>
      </div>
    </div>
  )
}

/** The hero's outline while GET /home loads. */
function HeroSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <LoadingStatus />
      <div aria-hidden className="overflow-hidden rounded-xl">
        <Skeleton className="aspect-[3/1] w-full rounded-none" />
        <div className="flex flex-col gap-2 bg-muted/40 p-4 lg:hidden">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>
      <Skeleton aria-hidden className="mx-auto h-2 w-16" />
    </div>
  )
}

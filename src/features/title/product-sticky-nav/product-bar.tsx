import { Loader2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MouseEvent, RefObject } from 'react'
import { useTranslation } from 'react-i18next'

import { SECTIONS } from './use-scroll-spy'
import type { Section } from './use-scroll-spy'
import { useAddToCart } from '../use-buy'
import { assetUrl } from '@/api/client'
import type { Edition, TitleDetail } from '@/api/titles'
import { Button } from '@/components/ui/button'
import { useFormatMoney } from '@/i18n/format'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { cn } from '@/lib/utils'

/** Prototype: "Added ✓" stays this long, then the button is back. */
const ADDED_MS = 1800

/** Phones (< 700px): two rows, the tabs as scrolling pills under the rest. */
const phone =
  "max-[700px]:grid max-[700px]:grid-cols-[auto_minmax(0,1fr)_auto_auto] max-[700px]:gap-x-2.5 max-[700px]:gap-y-2 max-[700px]:[grid-template-areas:'th_tt_pr_btn'_'nav_nav_nav_nav']"

/**
 * Prototype row 2: cover, title, the section tabs, the chosen edition's price
 * and Add to Cart. It slides open under the breadcrumb row once the title has
 * scrolled away (max-height, 0.22s, none with reduced motion). Out of the flow,
 * so it covers the page instead of pushing it down; `inert` while closed.
 */
export function ProductBar({
  title,
  edition,
  owned,
  visible,
  active,
  onSectionClick,
  edgeRef,
  innerRef,
}: {
  title: TitleDetail
  edition: Edition | undefined
  owned: boolean
  visible: boolean
  active: Section
  onSectionClick: (id: Section) => (event: MouseEvent) => void
  /** the bar's outer box: its lower edge is the sticky block's bottom */
  edgeRef: RefObject<HTMLDivElement | null>
  /** the content, measured at its full height even while the bar is closed */
  innerRef: RefObject<HTMLDivElement | null>
}) {
  const { t } = useTranslation('title')
  const formatMoney = useFormatMoney()
  const reduced = useReducedMotion()
  const navRef = useRef<HTMLElement>(null)

  // phones: keep the active pill in view as the reader moves on
  useEffect(() => {
    const nav = navRef.current
    const tab = nav?.querySelector<HTMLElement>('[aria-current="true"]')
    if (!nav || !tab || !visible || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollTo({
      left: tab.offsetLeft - 12,
      behavior: reduced ? 'auto' : 'smooth',
    })
  }, [active, visible, reduced])

  // the sale price, the list price struck through when the sale is this edition's
  const sale =
    edition &&
    title.onSale &&
    title.listPrice &&
    title.listPrice.amount > edition.price.amount &&
    edition.price.amount === title.price.amount
      ? title.listPrice
      : null

  return (
    <div
      ref={edgeRef}
      data-slot="product-bar"
      inert={!visible}
      className={cn(
        'absolute inset-x-0 top-full overflow-hidden bg-background/94 backdrop-blur-[10px] transition-[max-height] duration-[220ms] ease-out motion-reduce:transition-none',
        visible ? 'max-h-[70px] border-b max-[700px]:max-h-[112px]' : 'max-h-0',
      )}
    >
      <div
        ref={innerRef}
        className={cn('container flex items-center gap-[18px] py-2', phone)}
      >
        <div className="h-[42px] w-8 shrink-0 overflow-hidden rounded-[5px] border border-border bg-card [grid-area:th] max-[700px]:h-[38px] max-[700px]:w-7">
          {title.cover && (
            <img
              src={assetUrl(title.cover.url)}
              alt=""
              className="size-full object-cover"
            />
          )}
        </div>
        <p className="min-w-0 truncate font-heading text-[15px] font-bold [grid-area:tt] max-[700px]:text-sm">
          {title.title}
        </p>
        <nav
          ref={navRef}
          aria-label={t('stickyNav.sections')}
          className="ml-1.5 min-w-0 flex-1 [grid-area:nav] max-[700px]:m-0 max-[700px]:overflow-x-auto max-[700px]:pb-0.5 max-[700px]:[scrollbar-width:none] max-[700px]:[&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex gap-1 max-[700px]:gap-1.5">
            {SECTIONS.map((id) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  aria-current={active === id ? 'true' : undefined}
                  onClick={onSectionClick(id)}
                  className="flex items-center rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary aria-[current=true]:bg-accent aria-[current=true]:text-foreground max-[700px]:min-h-[38px] max-[700px]:border max-[700px]:border-border max-[700px]:px-3 max-[700px]:text-[13px] max-[700px]:aria-[current=true]:border-transparent"
                >
                  {id === 'reviews' ? t('stickyNav.reviews') : t(`tabs.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        {edition && (
          <p className="flex items-baseline gap-2 text-base font-extrabold whitespace-nowrap tabular-nums [grid-area:pr] max-[700px]:text-sm">
            {sale && (
              // only where it fits: desktop
              <s className="text-xs font-normal text-muted-foreground max-lg:hidden">
                <span className="sr-only">{t('stickyNav.listPrice')} </span>
                {formatMoney(sale)}
              </s>
            )}
            {formatMoney(edition.price)}
          </p>
        )}
        <BarCartButton
          // a new edition starts from "Add to Cart"
          key={edition?.sku}
          title={title}
          edition={edition}
          owned={owned}
        />
      </div>
    </div>
  )
}

/**
 * The buy box's add-to-cart (same mutation and toast), compact: a spinner
 * while it runs, then "Added ✓" for 1.8s. Disabled, with the buy box's words,
 * when the title is no longer sold or already in the library.
 */
function BarCartButton({
  title,
  edition,
  owned,
}: {
  title: TitleDetail
  edition: Edition | undefined
  owned: boolean
}) {
  const { t } = useTranslation('title')
  const add = useAddToCart(title)
  const [added, setAdded] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const blocked = !title.available
    ? t('buy.unavailable')
    : owned
      ? t('buy.inLibrary')
      : !edition
        ? t('buy.unavailable')
        : null

  const onClick = () => {
    if (!edition || add.isPending) return
    add.addToCart(edition, {
      onSuccess: () => {
        setAdded(true)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setAdded(false), ADDED_MS)
      },
    })
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={blocked !== null}
      aria-busy={add.isPending || undefined}
      className={cn(
        'h-10 rounded-lg px-[18px] font-bold [grid-area:btn] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background max-[700px]:h-[38px] max-[700px]:px-3 max-[700px]:text-[13px]',
        added && 'bg-success text-success-foreground hover:bg-success/90',
      )}
    >
      {add.isPending && (
        <Loader2Icon
          aria-hidden
          className="animate-spin motion-reduce:animate-none"
        />
      )}
      {blocked ??
        (added ? (
          t('stickyNav.added')
        ) : add.isPending ? (
          <span>
            <span aria-hidden>{t('stickyNav.addToCart')}</span>
            <span className="sr-only">{t('stickyNav.adding')}</span>
          </span>
        ) : (
          t('stickyNav.addToCart')
        ))}
    </Button>
  )
}

import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ShoppingCartIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CartItem } from './cart-item'
import { CartRecommendations } from './cart-recommendations'
import { GiftOption } from './gift-option'
import { SavedForLaterList } from './saved-for-later'
import { CheckoutButton, checkoutBlocked, OrderSummary } from './order-summary'
import { cartItemCount, useCart } from '@/api/cart'
import type { Cart, CartLine } from '@/api/cart'
import {
  EmptyActions,
  EmptyLabel,
  EmptyState,
  ErrorState,
} from '@/components/site/empty-state'
import { LoadingStatus } from '@/components/site/loading-status'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useFormatMoney } from '@/i18n/format'

/**
 * /cart. Desktop: the lines and the gift card on the left, the
 * order summary on the right. Phones: one column, with a bar stuck to the
 * bottom of the screen: the item count, the total and "Checkout".
 */
export function CartPage() {
  const { t } = useTranslation('cart')
  const query = useCart()
  const cart = query.data
  const count = cartItemCount(cart)

  return (
    <div className="container flex flex-col gap-8 pt-4 pb-8 lg:pt-8">
      <div className="flex flex-col gap-4">
        {/* desktop: "Back to Home" is in the header's nav row */}
        <Link
          to="/"
          className="flex h-6 items-center gap-1 self-start text-sm hover:underline lg:hidden"
        >
          <ArrowLeftIcon aria-hidden className="size-4" />
          {t('backHome')}
        </Link>

        {query.isError ? (
          <ErrorState
            title={t('loadErrorTitle')}
            onRetry={() => void query.refetch()}
            className="rounded-xl bg-card"
          />
        ) : !cart ? (
          <CartSkeleton />
        ) : cart.lines.length === 0 ? (
          <EmptyCart saved={cart.savedForLater} />
        ) : (
          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_379px] lg:items-start lg:gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="flex items-baseline gap-2 font-sans text-2xl leading-8 font-bold">
                {t('heading')}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  {t('summary.itemCount', { count })}
                </span>
              </h1>
              <ul
                aria-label={t('heading')}
                className="flex flex-col gap-2 rounded-xl bg-card px-4 pt-6 pb-4"
              >
                {cart.lines.map((line) => (
                  <CartItem key={line.lineId} line={line} />
                ))}
              </ul>
              <GiftOption cart={cart} />
              {cart.savedForLater.length > 0 && (
                <section
                  aria-labelledby="saved-heading"
                  className="flex flex-col gap-3 rounded-xl bg-card p-4"
                >
                  <h2
                    id="saved-heading"
                    className="font-sans text-base leading-6 font-bold"
                  >
                    {t('saved.heading', { count: cart.savedForLater.length })}
                  </h2>
                  <SavedForLaterList
                    saved={cart.savedForLater}
                    labelledBy="saved-heading"
                    className="sm:grid-cols-2"
                  />
                </section>
              )}
            </div>
            <OrderSummary cart={cart} />
          </div>
        )}
      </div>

      <CartRecommendations />

      {cart && cart.lines.length > 0 && <CheckoutBar cart={cart} />}
    </div>
  )
}

/**
 * An empty cart: back to the store, and anything saved for later
 * (each can move back to the cart).
 */
function EmptyCart({ saved }: { saved: Array<CartLine> }) {
  const { t } = useTranslation('cart')

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-sans text-2xl leading-8 font-bold">{t('heading')}</h1>
      <EmptyState
        icon={<ShoppingCartIcon />}
        title={t('empty.title')}
        text={t('empty.text')}
        className="w-full rounded-xl bg-card"
      >
        <EmptyActions>
          <Button asChild className="rounded-lg">
            <Link to="/titles">{t('empty.browse')}</Link>
          </Button>
        </EmptyActions>
        {saved.length > 0 && (
          <>
            <EmptyLabel id="saved-for-later">
              {t('empty.saved', { count: saved.length })}
            </EmptyLabel>
            <SavedForLaterList
              saved={saved}
              labelledBy="saved-for-later"
              className="w-full max-w-[400px] text-left"
            />
          </>
        )}
      </EmptyState>
    </div>
  )
}

/**
 * Phones: the total and "Checkout" stuck to the bottom of the screen
 * while the cart scrolls. Sticky, not fixed, so it stops at the end of the
 * cart and never covers the site footer.
 */
function CheckoutBar({ cart }: { cart: Cart }) {
  const { t } = useTranslation('cart')
  const formatMoney = useFormatMoney()
  const blocked = checkoutBlocked(cart)

  return (
    <div className="sticky bottom-0 z-20 -mx-6 -mb-8 flex flex-col gap-1 bg-card px-6 py-4 lg:hidden">
      <div className="flex items-center gap-4">
        <p className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs text-muted-foreground">
            {t('summary.itemCount', { count: cartItemCount(cart) })}
          </span>
          <span className="truncate text-2xl leading-8 font-bold">
            {formatMoney(cart.totals.total)}
          </span>
        </p>
        <CheckoutButton blocked={blocked} className="h-9">
          {t('summary.checkoutShort')}
        </CheckoutButton>
      </div>
      {blocked && (
        <p className="text-xs text-warning">{t('summary.giftNeedsEmail')}</p>
      )}
    </div>
  )
}

/** The cart's outline while GET /cart loads: heading, lines, the summary. */
function CartSkeleton() {
  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_379px] lg:items-start lg:gap-8">
      <LoadingStatus />
      <div aria-hidden className="flex flex-col gap-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex flex-col gap-5 rounded-xl bg-card px-4 pt-6 pb-4">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-4">
              <Skeleton className="h-[92px] w-[69px] shrink-0" />
              <div className="flex flex-1 flex-col gap-2 py-1">
                <Skeleton className="h-3 w-1/4" />
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-5 w-14 shrink-0" />
            </div>
          ))}
        </div>
        <Skeleton className="h-16 rounded-xl bg-card" />
      </div>
      <div
        aria-hidden
        className="flex flex-col gap-4 rounded-xl bg-card p-6 max-lg:hidden"
      >
        <Skeleton className="h-6 w-36" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
        <Skeleton className="h-9" />
        <Skeleton className="mt-2 h-10 rounded-lg" />
      </div>
    </div>
  )
}

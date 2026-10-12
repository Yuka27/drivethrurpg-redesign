import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ShoppingCartIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CartLine } from './cart-line'
import { CartRecommendations } from './cart-recommendations'
import { GiftCard } from './gift-card'
import { CheckoutButton, checkoutBlocked, OrderSummary } from './order-summary'
import { cartItemCount, useCart } from '@/api/cart'
import type { Cart } from '@/api/cart'
import { Button } from '@/components/ui/button'
import { useFormatMoney } from '@/i18n/format'

/**
 * /cart (Figma "Cart"). Desktop: the lines and the gift card on the left, the
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
          <p className="text-sm text-destructive">{t('loadError')}</p>
        ) : !cart ? (
          <div
            aria-busy
            className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_379px] lg:gap-8"
          >
            <div className="h-[406px] animate-pulse rounded-xl bg-card" />
            <div className="h-[470px] animate-pulse rounded-xl bg-card max-lg:hidden" />
          </div>
        ) : cart.lines.length === 0 ? (
          <EmptyCart />
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
                  <CartLine key={line.lineId} line={line} />
                ))}
              </ul>
              <GiftCard cart={cart} />
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

function EmptyCart() {
  const { t } = useTranslation('cart')
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-sans text-2xl leading-8 font-bold">{t('heading')}</h1>
      <div className="flex w-full flex-col items-center gap-3 rounded-xl bg-card px-4 py-10 text-center">
        <ShoppingCartIcon
          aria-hidden
          className="size-8 text-muted-foreground"
        />
        <p className="font-bold">{t('empty.title')}</p>
        <p className="text-sm text-muted-foreground">{t('empty.text')}</p>
        <Button asChild className="rounded-lg">
          <Link to="/titles">{t('empty.browse')}</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * Figma mobile: the total and "Checkout" stuck to the bottom of the screen
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

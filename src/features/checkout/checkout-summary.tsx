import { ChevronDownIcon, LockIcon } from 'lucide-react'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { assetUrl } from '@/api/client'
import type { CheckoutSession } from '@/api/checkout'
import { Button } from '@/components/ui/button'
import { TERMS_URL } from '@/config/links'
import { useFormatMoney, useFormatNumber } from '@/i18n/format'
import { cn } from '@/lib/utils'

/**
 * Mockup "Order summary": the lines, subtotal, sale savings, the promo code,
 * shipping, the total with the VAT inside it, then "Pay $99.96". Desktop: it
 * stays in view beside the form. Phones: one line with the total, opening to
 * the rest; the Pay button stays below.
 */
export function CheckoutSummary({
  session,
  paying,
}: {
  session: CheckoutSession
  /** the order is being placed */
  paying: boolean
}) {
  const { t } = useTranslation('checkout')
  const formatMoney = useFormatMoney()
  const formatPercent = useFormatNumber({
    style: 'percent',
    maximumFractionDigits: 0,
  })
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const { cart, shippingRate, total, vatIncluded } = session
  const { totals, promo } = cart

  return (
    <aside
      aria-labelledby={`${bodyId}-title`}
      className="flex flex-col lg:sticky lg:top-[calc(var(--header-h,0px)+20px)] lg:rounded-[14px] lg:border lg:bg-card lg:p-[22px]"
    >
      <h2
        id={`${bodyId}-title`}
        className="mb-3.5 font-heading text-[17px] font-bold max-lg:sr-only"
      >
        {t('summary.title')}
      </h2>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3.5 font-semibold lg:hidden"
      >
        <span className="flex items-center gap-1.5">
          {t(open ? 'summary.hide' : 'summary.show')}
          <ChevronDownIcon
            aria-hidden
            className={cn('size-4 transition-transform', open && 'rotate-180')}
          />
        </span>
        <span>{formatMoney(total)}</span>
      </button>

      <div
        id={bodyId}
        className={cn(
          'max-lg:mt-2 max-lg:rounded-xl max-lg:border max-lg:bg-card max-lg:p-4',
          !open && 'max-lg:hidden',
        )}
      >
        <ul className="mb-2">
          {cart.lines.map((line) => (
            <li key={line.lineId} className="flex items-center gap-3 py-2">
              <span className="relative aspect-[3/4] w-[46px] shrink-0 rounded-[5px] border bg-muted">
                {line.title.cover && (
                  <img
                    src={assetUrl(line.title.cover.url)}
                    alt=""
                    className="size-full rounded-[5px] object-cover"
                  />
                )}
                {line.qty > 1 && (
                  <span
                    aria-label={t('summary.qty', { count: line.qty })}
                    className="absolute -top-1.5 -right-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-muted-foreground px-1 text-[10px] font-bold text-background"
                  >
                    {line.qty}
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] leading-tight font-bold">
                  {line.title.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {line.formatLabel}
                </span>
              </span>
              <span className="text-sm font-semibold">
                {formatMoney({
                  ...line.unitPrice,
                  amount: line.unitPrice.amount * line.qty,
                })}
              </span>
            </li>
          ))}
        </ul>
        <dl className="text-sm text-muted-foreground">
          <Row label={t('summary.subtotal')}>
            {formatMoney(totals.subtotal)}
          </Row>
          {totals.saleSavings.amount > 0 && (
            <Row label={t('summary.saleSavings')} good>
              −{formatMoney(totals.saleSavings)}
            </Row>
          )}
          {promo && (
            <Row label={t('summary.promo', { code: promo.code })} good>
              −{formatMoney(promo.discount)}
            </Row>
          )}
          {shippingRate && (
            <Row label={t('summary.shipping', { rate: shippingRate.label })}>
              {formatMoney(shippingRate.price)}
            </Row>
          )}
        </dl>
        <p className="mt-2.5 flex items-baseline justify-between border-t pt-3.5">
          <span className="font-semibold">{t('summary.total')}</span>
          <span className="font-heading text-2xl font-extrabold">
            {formatMoney(total)}
          </span>
        </p>
        {vatIncluded && vatIncluded.amount > 0 && (
          <p className="mt-0.5 text-right text-xs text-muted-foreground">
            {t('summary.vat', {
              amount: formatMoney(vatIncluded),
              rate: formatPercent(session.taxRate),
            })}
          </p>
        )}
      </div>

      <Button
        type="submit"
        form="checkout-form"
        disabled={paying}
        aria-busy={paying || undefined}
        className="mt-[18px] h-12 w-full rounded-[10px] text-base font-bold"
      >
        {paying
          ? t('summary.processing')
          : t('summary.pay', { amount: formatMoney(total) })}
      </Button>
      <p className="mt-3 text-center text-xs leading-normal text-muted-foreground">
        <LockIcon aria-hidden className="mr-1 inline size-3.5 align-[-2px]" />
        <Trans
          t={t}
          i18nKey="summary.fine"
          components={{
            terms: (
              <a
                href={TERMS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              />
            ),
          }}
        />
      </p>
    </aside>
  )
}

function Row({
  label,
  good,
  children,
}: {
  label: string
  good?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex justify-between gap-3 py-[5px]">
      <dt>{label}</dt>
      <dd
        className={cn('font-semibold text-foreground', good && 'text-success')}
      >
        {children}
      </dd>
    </div>
  )
}

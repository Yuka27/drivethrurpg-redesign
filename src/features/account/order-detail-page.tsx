import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, CheckIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { pageTitleClass } from './account-page'
import { brandName } from './card-brand'
import { openInNewTab } from './open-in-new-tab'
import { useStatusLabel } from './order-status'
import { useLastOrdersSearch } from './orders-search'
import { useOpenInvoice } from './use-open-invoice'
import { ApiError, assetUrl } from '@/api/client'
import { useFileDownload, useLibraryByTitle } from '@/api/library'
import type { LibraryItem } from '@/api/library'
import { useMe } from '@/api/me'
import { useOrder, useResendReceipt, useTitleSummary } from '@/api/orders'
import type { OrderDetail, OrderLine } from '@/api/orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TODO_URL } from '@/config/footer'
import { useFormatDate, useFormatMoney, useRegionName } from '@/i18n/format'
import { cn } from '@/lib/utils'

const cardClass = 'rounded-xl border border-muted bg-card'

/** One order: progress, items with their library state, help, and the payment summary. */
export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { t } = useTranslation('account')
  const order = useOrder(orderId)
  // back to the list as the user left it (filters, page), not a fresh one
  const lastSearch = useLastOrdersSearch((state) => state.search)
  const notFound = order.error instanceof ApiError && order.error.status === 404

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/orders"
        search={lastSearch}
        className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden className="size-3.5" />
        {t('orderDetail.back')}
      </Link>

      {notFound ? (
        <div className={cn(cardClass, 'p-6 text-sm')}>
          <h1 className="font-sans text-lg font-bold tracking-normal">
            {t('orderDetail.notFound')}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {t('orderDetail.notFoundHint')}
          </p>
        </div>
      ) : order.isError ? (
        <p className="text-sm text-destructive">{t('loadError')}</p>
      ) : order.data ? (
        <OrderDetailContent order={order.data} />
      ) : (
        <div aria-busy className="flex flex-col gap-4">
          <span className="h-8 w-64 animate-pulse rounded bg-muted" />
          <span className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      )}
    </div>
  )
}

function OrderDetailContent({ order }: { order: OrderDetail }) {
  const { t } = useTranslation('account')
  const statusLabel = useStatusLabel()
  const formatDate = useFormatDate({
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const itemCount = order.lines.reduce((count, line) => count + line.qty, 0)

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className={pageTitleClass}>
            {t('orderDetail.title', { number: order.number })}
          </h1>
          <Badge variant="outline" className="h-6 rounded-full px-2.5 text-sm">
            {statusLabel(order.status)}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('orderDetail.meta', {
            count: itemCount,
            date: formatDate(order.placedAt),
          })}
        </p>
      </div>

      <OrderProgress order={order} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-5">
          <ul aria-label={t('orderDetail.items')} className={cardClass}>
            {order.lines.map((line, index) => (
              <OrderItem key={line.lineId} line={line} first={index === 0} />
            ))}
          </ul>
          <section
            aria-labelledby="order-help"
            className={cn(cardClass, 'flex flex-col items-start gap-1 p-4')}
          >
            <h2
              id="order-help"
              className="font-sans text-sm font-bold tracking-normal"
            >
              {t('orderDetail.helpTitle')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('orderDetail.helpBody')}
            </p>
            {/* TODO_URL: support pages are not routed yet */}
            <Button asChild variant="secondary" size="sm" className="mt-2">
              <a href={TODO_URL}>{t('orderDetail.contactSupport')}</a>
            </Button>
          </section>
        </div>
        <PaymentSummary order={order} />
      </div>
    </>
  )
}

/**
 * Placed → Paid → (Shipped, for orders with physical items) → In your library.
 * Done steps and the line between them are in the primary colour.
 */
function OrderProgress({ order }: { order: OrderDetail }) {
  const { t } = useTranslation('account')
  const paid = ['paid', 'shipped', 'completed'].includes(order.status)
  const steps = [
    { label: t('orderDetail.stepPlaced'), done: true },
    { label: t('orderDetail.stepPaid'), done: paid },
    // physical items, or an order the API already calls shipped
    ...(order.shippingAddress || order.status === 'shipped'
      ? [
          {
            label: t('orderDetail.stepShipped'),
            done: order.status === 'shipped',
          },
        ]
      : []),
    { label: t('orderDetail.stepLibrary'), done: paid && order.digitalReady },
  ]

  return (
    <ol aria-label={t('orderDetail.progress')} className="flex px-2 sm:px-10">
      {steps.map((step, index) => {
        const next = steps[index + 1] as (typeof steps)[number] | undefined
        return (
          <li
            key={step.label}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-2 text-center text-xs',
              step.done ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            {/* the track to the next step, from this dot's centre to the next one's */}
            {next && (
              <span
                aria-hidden
                className={cn(
                  'absolute top-[5px] left-1/2 h-0.5 w-full',
                  next.done ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative size-3 rounded-full',
                step.done ? 'bg-primary' : 'border-2 border-muted bg-card',
              )}
            />
            <span>
              {step.label}
              <span className="sr-only">
                {' '}
                (
                {step.done
                  ? t('orderDetail.stepDone')
                  : t('orderDetail.stepNotYet')}
                )
              </span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Desktop: cover, title, price and the library button in one row.
 * Mobile (mockup): the button moves under the title.
 */
function OrderItem({ line, first }: { line: OrderLine; first: boolean }) {
  const formatMoney = useFormatMoney()
  const { data: title } = useTitleSummary(line.title.id)
  const { data: library } = useLibraryByTitle()
  const owned = library?.get(line.title.id)
  const price = {
    amount: line.unitPrice.amount * line.qty,
    currency: line.unitPrice.currency,
  }

  return (
    <li
      className={cn(
        'grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 p-4 lg:grid-cols-[52px_minmax(0,1fr)_auto_auto]',
        !first && 'border-t border-muted',
      )}
    >
      {line.title.cover ? (
        <img
          src={assetUrl(line.title.cover.url)}
          alt=""
          width={52}
          height={68}
          className="row-span-2 h-[68px] w-[52px] rounded-md object-cover lg:row-span-1"
        />
      ) : (
        <span
          aria-hidden
          className="row-span-2 h-[68px] w-[52px] rounded-md bg-muted lg:row-span-1"
        />
      )}
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? (
          <>
            <p className="truncate text-sm font-bold">{title.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {title.publisher.name}
              {line.formatLabel && ` · ${line.formatLabel}`}
            </p>
          </>
        ) : (
          <>
            <span className="h-4 w-40 max-w-full animate-pulse rounded bg-muted" />
            <span className="h-3 w-28 max-w-full animate-pulse rounded bg-muted" />
          </>
        )}
      </div>
      <p className="text-sm font-semibold">{formatMoney(price)}</p>
      {owned && title && (
        <div className="col-start-2 col-end-4 lg:col-start-4 lg:col-end-5">
          <LibraryButton item={owned} title={title.title} />
        </div>
      )}
    </li>
  )
}

/**
 * New or updated files waiting: "Download" (one file: straight away; several:
 * on the library page, where each can be picked). Nothing new: "In library ✓".
 */
function LibraryButton({ item, title }: { item: LibraryItem; title: string }) {
  const { t } = useTranslation('account')
  const download = useFileDownload()
  const waiting = item.hasUpdate || item.files.some((file) => file.isNew)
  const buttonClass = 'border border-border'

  if (waiting && item.files.length === 1) {
    return (
      <Button
        variant="secondary"
        size="sm"
        className={buttonClass}
        aria-label={t('orderDetail.downloadLabel', { title })}
        disabled={download.isPending}
        onClick={() =>
          void openInNewTab(() => download.mutateAsync(item.files[0].id)).catch(
            () => toast.error(t('orderDetail.downloadFailed')),
          )
        }
      >
        {t('orderDetail.download')}
      </Button>
    )
  }

  return (
    <Button asChild variant="secondary" size="sm" className={buttonClass}>
      <Link
        to="/library"
        aria-label={t(
          waiting ? 'orderDetail.downloadLabel' : 'orderDetail.inLibraryLabel',
          { title },
        )}
      >
        {waiting ? (
          t('orderDetail.download')
        ) : (
          <>
            {t('orderDetail.inLibrary')}
            <CheckIcon aria-hidden />
          </>
        )}
      </Link>
    </Button>
  )
}

function PaymentSummary({ order }: { order: OrderDetail }) {
  const { t } = useTranslation('account')
  const formatMoney = useFormatMoney()
  const regionName = useRegionName()
  const { data: me } = useMe()
  const invoice = useOpenInvoice()
  const resend = useResendReceipt()
  const { totals } = order
  const money = (amount: number) =>
    formatMoney({ amount, currency: totals.currency })

  const rows: Array<[string, string]> = [
    [t('orderDetail.subtotal'), money(totals.subtotal)],
    ...(totals.savings > 0
      ? [
          [t('orderDetail.savings'), `−${money(totals.savings)}`] as [
            string,
            string,
          ],
        ]
      : []),
    ...(totals.shipping > 0
      ? [
          [t('orderDetail.shipping'), money(totals.shipping)] as [
            string,
            string,
          ],
        ]
      : []),
    [t('orderDetail.tax'), money(totals.tax)],
  ]

  return (
    <section
      aria-labelledby="payment-summary"
      className={cn(cardClass, 'flex flex-col gap-3 p-5')}
    >
      <h2
        id="payment-summary"
        className="font-sans text-base font-bold tracking-normal"
      >
        {t('orderDetail.summary')}
      </h2>
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between gap-4 border-t border-muted pt-3 text-base font-bold">
          <dt>{t('orderDetail.total')}</dt>
          <dd className="text-right">
            {money(totals.total)}
            {/* the VAT inside the total belongs to the total's value */}
            {order.vatIncluded ? (
              <span className="block text-xs font-normal text-muted-foreground">
                {t('orderDetail.vatIncluded', {
                  amount: money(order.vatIncluded),
                })}
              </span>
            ) : null}
          </dd>
        </div>
        {order.payment && (
          <div className="mt-1 flex justify-between gap-4">
            <dt className="text-muted-foreground">
              {t('orderDetail.paidWith')}
            </dt>
            <dd>
              {t('orders.card', {
                brand: brandName(order.payment.brand),
                last4: order.payment.last4,
              })}
            </dd>
          </div>
        )}
      </dl>

      {order.shippingAddress && (
        <div className="border-t border-muted pt-3 text-sm">
          <h3 className="font-sans text-sm font-bold tracking-normal">
            {t('orderDetail.shippingTo')}
          </h3>
          <address className="mt-1 text-muted-foreground not-italic">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 && (
              <>
                <br />
                {order.shippingAddress.line2}
              </>
            )}
            <br />
            {order.shippingAddress.postalCode} {order.shippingAddress.city}
            <br />
            {regionName(order.shippingAddress.country)}
          </address>
          {order.shippingRate && (
            <p className="mt-1 text-xs text-muted-foreground">
              {order.shippingRate.eta
                ? t('orderDetail.shippingRate', {
                    label: order.shippingRate.label,
                    eta: order.shippingRate.eta,
                  })
                : order.shippingRate.label}
            </p>
          )}
        </div>
      )}

      <div className="mt-1 flex flex-col gap-2">
        <Button
          className="w-full"
          disabled={invoice.pending}
          onClick={() => void invoice.open(order.id)}
        >
          {t('orderDetail.invoice')}
        </Button>
        <Button
          variant="secondary"
          className="w-full border border-border"
          disabled={resend.isPending}
          onClick={() =>
            resend.mutate(order.id, {
              onSuccess: () =>
                toast.success(
                  me
                    ? t('orderDetail.emailSent', { email: me.email })
                    : t('orderDetail.emailSentNoAddress'),
                ),
              onError: () => toast.error(t('orderDetail.emailFailed')),
            })
          }
        >
          {t('orderDetail.emailReceipt')}
        </Button>
      </div>
    </section>
  )
}

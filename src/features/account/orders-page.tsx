import { Link } from '@tanstack/react-router'
import { DownloadIcon, SearchIcon } from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { AccountBreadcrumb } from './account-breadcrumb'
import { brandName } from './card-brand'
import { PreferenceSelect } from './preference-controls'
import { assetUrl } from '@/api/client'
import { useOrder, useOrders, useReceipt, useTitleSummary } from '@/api/orders'
import type { OrderLine, OrderSummary } from '@/api/orders'
import { Pagination } from '@/components/site/pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFormatDate, useFormatMoney } from '@/i18n/format'

const PAGE_SIZE = 5

type Period = 'month' | 'quarter' | 'year' | 'all'
const PERIOD_MONTHS: Record<Period, number | null> = {
  month: 1,
  quarter: 3,
  year: 12,
  all: null,
}

/** Statuses with a translation; anything else the API sends is shown as it comes. */
const STATUS_KEYS = {
  paid: 'orders.statusPaid',
  shipped: 'orders.statusShipped',
  pending: 'orders.statusPending',
  refunded: 'orders.statusRefunded',
  cancelled: 'orders.statusCancelled',
} as const

const filterClass =
  'h-8 data-[size=default]:h-8 max-lg:flex-1 max-lg:justify-between'

/** Order history: filter by date and status, search by order number, 5 orders a page. */
export function OrdersPage() {
  const { t } = useTranslation('account')
  const searchId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const orders = useOrders()
  const [query, setQuery] = useState('')
  // Figma: "Last month" is what the page opens on
  const [period, setPeriod] = useState<Period>('month')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const statusLabel = (value: string) =>
    value in STATUS_KEYS
      ? t(STATUS_KEYS[value as keyof typeof STATUS_KEYS])
      : value.charAt(0).toUpperCase() + value.slice(1)
  const statuses = [...new Set((orders.data ?? []).map((o) => o.status))].sort()

  const filtered = useMemo(() => {
    const months = PERIOD_MONTHS[period]
    const since = months === null ? null : new Date()
    since?.setMonth(since.getMonth() - (months ?? 0))
    const needle = query.trim().toLowerCase()
    return (orders.data ?? [])
      .filter((o) => !since || new Date(o.placedAt) >= since)
      .filter((o) => status === 'all' || o.status === status)
      .filter((o) => o.number.toLowerCase().includes(needle))
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt))
  }, [orders.data, period, status, query])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  // a new filter starts from the first page
  const filterBy =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }
  const clearFilters = () => {
    setQuery('')
    setPeriod('all')
    setStatus('all')
    setPage(1)
  }

  const periodLabels: Record<Period, string> = {
    month: t('orders.periodMonth'),
    quarter: t('orders.periodQuarter'),
    year: t('orders.periodYear'),
    all: t('orders.periodAll'),
  }

  return (
    <div className="flex flex-col gap-2">
      <AccountBreadcrumb current={t('orders.title')} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-2xl leading-8 font-bold tracking-normal">
            {t('orders.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('orders.subtitle')}
          </p>
        </div>

        {orders.data?.length === 0 ? (
          <p className="rounded-xl bg-card p-6 text-sm">{t('orders.empty')}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Figma: one row on desktop; on mobile the search, then both filters side by side */}
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
              <div className="relative min-w-0 flex-1">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <label htmlFor={searchId} className="sr-only">
                  {t('orders.search')}
                </label>
                <Input
                  id={searchId}
                  type="search"
                  value={query}
                  onChange={(event) => filterBy(setQuery)(event.target.value)}
                  placeholder={t('orders.searchPlaceholder')}
                  className="h-8 rounded-lg border-border bg-card pl-8 shadow-none dark:bg-card"
                />
              </div>
              <div className="flex gap-2">
                <PreferenceSelect
                  label={t('orders.period')}
                  value={period}
                  options={(Object.keys(PERIOD_MONTHS) as Array<Period>).map(
                    (value) => ({ value, label: periodLabels[value] }),
                  )}
                  onValueChange={(value) =>
                    filterBy(setPeriod)(value as Period)
                  }
                  className={filterClass}
                />
                <PreferenceSelect
                  label={t('orders.status')}
                  value={status}
                  options={[
                    { value: 'all', label: t('orders.statusAll') },
                    ...statuses.map((value) => ({
                      value,
                      label: statusLabel(value),
                    })),
                  ]}
                  onValueChange={filterBy(setStatus)}
                  className={filterClass}
                />
              </div>
            </div>

            {orders.isError && (
              <p className="text-sm text-destructive">{t('loadError')}</p>
            )}

            {orders.data && filtered.length === 0 && (
              <div className="flex flex-col items-start gap-3 rounded-xl bg-card p-6 text-sm">
                <p>{t('orders.noMatches')}</p>
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  {t('orders.clearFilters')}
                </Button>
              </div>
            )}

            {visible.length > 0 && (
              <ul
                ref={listRef}
                aria-label={t('orders.title')}
                className="flex scroll-mt-24 flex-col gap-2"
              >
                {visible.map((order) => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </ul>
            )}

            <Pagination
              page={current}
              pageCount={pageCount}
              onPageChange={(next) => {
                setPage(next)
                listRef.current?.scrollIntoView({ block: 'start' })
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * One order. The summary (number, date, total) comes with the list; the lines
 * and the card it was paid with load per order, so they fill in a moment later.
 * Desktop: summary and buttons on one row, lines under them. Mobile: summary,
 * lines, then the two buttons side by side.
 */
function OrderCard({ order }: { order: OrderSummary }) {
  const { t } = useTranslation('account')
  const formatDate = useFormatDate({
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const formatMoney = useFormatMoney()
  const { data: detail } = useOrder(order.id)
  const receipt = useReceipt()

  const openInvoice = () => {
    // open the tab now (inside the click) so pop-up blockers allow it, then
    // point it at the PDF once the API says where it is
    const tab = window.open('', '_blank')
    if (tab) tab.opener = null
    receipt.mutate(order.id, {
      onSuccess: ({ pdfUrl }) => {
        if (tab) tab.location.href = assetUrl(pdfUrl)
        else window.location.assign(assetUrl(pdfUrl))
      },
      onError: () => {
        tab?.close()
        toast.error(t('orders.invoiceFailed'))
      },
    })
  }

  const fields = [
    [t('orders.order'), order.number],
    [t('orders.placed'), formatDate(order.placedAt)],
    [t('orders.total'), formatMoney(order.total)],
    [
      t('orders.paidWith'),
      detail?.payment
        ? t('orders.card', {
            brand: brandName(detail.payment.brand),
            last4: detail.payment.last4,
          })
        : '…',
    ],
  ] as const

  return (
    <li className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl bg-card p-4 lg:grid-cols-[minmax(0,1fr)_auto]">
      <dl className="flex justify-between gap-4 text-xs lg:justify-start">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold whitespace-nowrap">{value}</dd>
          </div>
        ))}
      </dl>

      <ul className="flex flex-col gap-3 lg:col-span-2 lg:row-start-2">
        {detail
          ? detail.lines.map((line) => (
              <OrderLineRow key={line.lineId} line={line} />
            ))
          : Array.from({ length: Math.max(1, order.itemCount) }, (_, i) => (
              <li key={i} className="flex items-center gap-2.5">
                <span className="h-16 w-[50px] shrink-0 animate-pulse rounded-md bg-muted" />
                <span className="sr-only">{t('orders.loadingLine')}</span>
              </li>
            ))}
      </ul>

      <div className="grid grid-cols-2 gap-2 lg:col-start-2 lg:row-start-1 lg:flex">
        <Button
          variant="secondary"
          size="sm"
          className="border border-accent"
          aria-label={t('orders.invoiceLabel', { number: order.number })}
          disabled={receipt.isPending}
          onClick={openInvoice}
        >
          <DownloadIcon aria-hidden />
          {t('orders.invoice')}
        </Button>
        <Button
          asChild
          variant="secondary"
          size="sm"
          className="border border-accent"
        >
          <Link
            to="/orders/$orderId"
            params={{ orderId: order.number }}
            aria-label={t('orders.viewDetailsLabel', { number: order.number })}
          >
            {t('orders.viewDetails')}
          </Link>
        </Button>
      </div>
    </li>
  )
}

/** Cover, title and publisher (from the title API), and what the line cost. */
function OrderLineRow({ line }: { line: OrderLine }) {
  const { t } = useTranslation('account')
  const formatMoney = useFormatMoney()
  const { data: title } = useTitleSummary(line.title.id)
  const price = {
    amount: line.unitPrice.amount * line.qty,
    currency: line.unitPrice.currency,
  }

  return (
    <li className="flex items-center gap-2.5">
      {line.title.cover ? (
        <img
          src={assetUrl(line.title.cover.url)}
          alt=""
          width={50}
          height={64}
          loading="lazy"
          className="h-16 w-[50px] shrink-0 rounded-md object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="h-16 w-[50px] shrink-0 rounded-md bg-muted"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {title ? (
          <>
            <p className="truncate text-sm font-semibold">{title.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {title.publisher.name}
              {line.qty > 1 && ` · ${t('orders.qty', { count: line.qty })}`}
            </p>
          </>
        ) : (
          <>
            <span className="h-4 w-40 max-w-full animate-pulse rounded bg-muted" />
            <span className="h-3 w-28 max-w-full animate-pulse rounded bg-muted" />
            <span className="sr-only">{t('orders.loadingLine')}</span>
          </>
        )}
      </div>
      <p className="shrink-0 text-sm font-semibold">{formatMoney(price)}</p>
    </li>
  )
}

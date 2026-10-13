import { Link } from '@tanstack/react-router'
import { DownloadIcon } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { AccountPage } from './account-page'
import { OptionSelect } from '@/components/site/option-select'
import { SearchField } from '@/components/site/search-field'
import { brandName } from './card-brand'
import { useStatusLabel } from './order-status'
import type { OrdersSearch, Period } from './orders-search'
import { useOpenInvoice } from './use-open-invoice'
import { assetUrl } from '@/api/client'
import { useOrder, useOrders, useTitleSummary } from '@/api/orders'
import type { OrderLine, OrderSummary } from '@/api/orders'
import { Pagination } from '@/components/site/pagination'
import { Button } from '@/components/ui/button'
import { useFormatDate, useFormatMoney } from '@/i18n/format'

const PAGE_SIZE = 5

const PERIOD_MONTHS: Record<Period, number | null> = {
  month: 1,
  quarter: 3,
  year: 12,
  all: null,
}

const filterClass =
  'h-8 data-[size=default]:h-8 max-lg:flex-1 max-lg:justify-between'

/**
 * Order history: filter by date and status, search by order number, 5 orders a
 * page. The filters come from the URL (see orders-search.ts) through the route.
 */
export function OrdersPage({
  search,
  onSearchChange,
}: {
  search: OrdersSearch
  onSearchChange: (patch: Partial<OrdersSearch>) => void
}) {
  const { t } = useTranslation('account')
  const listRef = useRef<HTMLUListElement>(null)
  const orders = useOrders()
  const { q: query, period, status, page } = search

  const statusLabel = useStatusLabel()
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
  const filterBy = (patch: Partial<OrdersSearch>) =>
    onSearchChange({ ...patch, page: 1 })
  const clearFilters = () =>
    onSearchChange({ q: '', period: 'all', status: 'all', page: 1 })

  const periodLabels: Record<Period, string> = {
    month: t('orders.periodMonth'),
    quarter: t('orders.periodQuarter'),
    year: t('orders.periodYear'),
    all: t('orders.periodAll'),
  }

  return (
    <AccountPage title={t('orders.title')} subtitle={t('orders.subtitle')}>
      {orders.data?.length === 0 ? (
        <p className="rounded-xl bg-card p-6 text-sm">{t('orders.empty')}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Figma: one row on desktop; on mobile the search, then both filters side by side */}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-4">
            <SearchField
              label={t('orders.search')}
              placeholder={t('orders.searchPlaceholder')}
              value={query}
              onChange={(q) => filterBy({ q })}
            />
            <div className="flex gap-2">
              <OptionSelect
                label={t('orders.period')}
                value={period}
                options={(Object.keys(PERIOD_MONTHS) as Array<Period>).map(
                  (value) => ({ value, label: periodLabels[value] }),
                )}
                onValueChange={(value) => filterBy({ period: value as Period })}
                className={filterClass}
              />
              <OptionSelect
                label={t('orders.status')}
                value={status}
                options={[
                  { value: 'all', label: t('orders.statusAll') },
                  ...statuses.map((value) => ({
                    value,
                    label: statusLabel(value),
                  })),
                ]}
                onValueChange={(value) => filterBy({ status: value })}
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
              onSearchChange({ page: next })
              listRef.current?.scrollIntoView({ block: 'start' })
            }}
          />
        </div>
      )}
    </AccountPage>
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
  const invoice = useOpenInvoice()

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
          disabled={invoice.pending}
          onClick={() => void invoice.open(order.id)}
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

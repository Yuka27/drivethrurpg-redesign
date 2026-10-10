import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { OrdersPage } from './orders-page'
import { assetUrl } from '@/api/client'
import { Pagination } from '@/components/site/pagination'
import { apiError, mockApi } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const usd = (amount: number) => ({ amount, currency: 'USD' })

const order = (
  number: string,
  placedAt: string,
  status = 'paid',
  total = 1999,
) => ({
  id: `ord_${number}`,
  number,
  placedAt,
  status,
  total: usd(total),
  itemCount: 1,
})

/** "Today" is 10 Oct 2026: two orders in the last month, five more before it. */
const orders = [
  order('DT-0000001', '2026-10-09T14:30:00Z', 'paid', 6498),
  order('DT-0000002', '2026-10-01T08:00:00Z', 'shipped'),
  order('DT-0000003', '2026-08-14T09:00:00Z'),
  order('DT-0000004', '2026-06-02T12:00:00Z', 'shipped'),
  order('DT-0000005', '2026-03-02T12:00:00Z'),
  order('DT-0000006', '2025-12-02T12:00:00Z'),
  order('DT-0000007', '2024-12-02T12:00:00Z'),
]

const detail = (id: string) => ({
  id,
  lines:
    id === 'ord_DT-0000001'
      ? [
          {
            lineId: 'ln_1',
            title: { id: 'ttl_a', cover: { url: '/img/a.jpg', alt: '' } },
            qty: 1,
            unitPrice: usd(1999),
          },
          {
            lineId: 'ln_2',
            title: { id: 'ttl_b', cover: null },
            qty: 2,
            unitPrice: usd(2249),
          },
        ]
      : [
          {
            lineId: 'ln_1',
            title: { id: 'ttl_a', cover: null },
            qty: 1,
            unitPrice: usd(1999),
          },
        ],
  payment: { brand: 'visa', last4: '4242' },
})

const titles = {
  ttl_a: {
    id: 'ttl_a',
    title: 'Vaesen: Mythic Carpathia',
    publisher: { id: 'pub_free_league', name: 'Free League Publishing' },
  },
  ttl_b: {
    id: 'ttl_b',
    title: 'Exploring Eberron',
    publisher: { id: 'pub_vpd', name: 'Visionary Production and Design' },
  },
}

function mockOrdersApi(overrides: Record<string, Handler> = {}) {
  const handlers: Record<string, Handler> = {
    'GET /orders': { body: { items: orders } },
    'GET /titles/ttl_a': { body: titles.ttl_a },
    'GET /titles/ttl_b': { body: titles.ttl_b },
  }
  for (const { id } of orders) {
    handlers[`GET /orders/${id}`] = { body: detail(id) }
    handlers[`GET /orders/${id}/receipt`] = {
      body: { pdfUrl: `/files/receipt-${id}.pdf` },
    }
  }
  return mockApi({ ...handlers, ...overrides })
}

const shownOrders = () =>
  within(screen.getByRole('list', { name: 'Orders' }))
    .getAllByText(/^DT-/)
    .map((el) => el.textContent)

async function renderPage() {
  const result = await renderWithProviders(<OrdersPage />)
  await screen.findByRole('list', { name: 'Orders' })
  return result
}

async function choose(
  user: Awaited<ReturnType<typeof renderPage>>['user'],
  select: string,
  option: string,
) {
  await user.click(screen.getByRole('combobox', { name: select }))
  await user.click(await screen.findByRole('option', { name: option }))
}

beforeEach(() => {
  // only Date: React Query and user-event keep real timers
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-10T12:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('OrdersPage', () => {
  it('opens on the last month, newest first, with each order filled in', async () => {
    mockOrdersApi()
    await renderPage()

    expect(shownOrders()).toEqual(['DT-0000001', 'DT-0000002'])

    const first = screen
      .getAllByRole('listitem')
      .find((li) => within(li).queryByText('DT-0000001')) as HTMLElement
    expect(within(first).getByText('Oct 9, 2026')).toBeVisible()
    expect(within(first).getByText('$64.98')).toBeVisible()
    // lines, payment card and title names come from the per-order requests
    expect(await within(first).findByText('Visa ••4242')).toBeVisible()
    expect(await within(first).findByText('Exploring Eberron')).toBeVisible()
    expect(
      within(first).getByText('Visionary Production and Design · Qty 2'),
    ).toBeVisible()
    expect(within(first).getByText('$44.98')).toBeVisible() // 2 × $22.49
  })

  it('pages through the whole history, five at a time', async () => {
    mockOrdersApi()
    const { user } = await renderPage()

    await choose(user, 'Date', 'All time')
    expect(shownOrders()).toHaveLength(5)
    expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: 'Prev' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(shownOrders()).toEqual(['DT-0000006', 'DT-0000007'])
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    // a new filter starts again from page 1
    await choose(user, 'Status', 'Shipped')
    expect(shownOrders()).toEqual(['DT-0000002', 'DT-0000004'])
    expect(
      screen.queryByRole('navigation', { name: 'Pagination' }),
    ).not.toBeInTheDocument()
  })

  it('finds an order by number, and clears filters when nothing matches', async () => {
    mockOrdersApi()
    const { user } = await renderPage()
    const search = screen.getByRole('searchbox', {
      name: 'Search orders by number',
    })

    await user.type(search, 'dt-0000002')
    expect(shownOrders()).toEqual(['DT-0000002'])

    await user.clear(search)
    await user.type(search, '0000007') // older than the last month
    expect(screen.getByText('No orders match these filters.')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(search).toHaveValue('')
    expect(shownOrders()).toHaveLength(5)
    expect(screen.getByRole('combobox', { name: 'Date' })).toHaveTextContent(
      'All time',
    )
  })

  it('opens the invoice PDF in a new tab', async () => {
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() }
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValue(tab as unknown as Window)
    mockOrdersApi()
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Invoice for order DT-0000001' }),
    )

    // the tab opens inside the click, so pop-up blockers allow it
    expect(open).toHaveBeenCalledWith('', '_blank')
    expect(tab.opener).toBeNull()
    await waitFor(() =>
      expect(tab.location.href).toBe(
        assetUrl('/files/receipt-ord_DT-0000001.pdf'),
      ),
    )
  })

  it('closes the tab and says so when the invoice is not available', async () => {
    const tab = { opener: {}, location: { href: '' }, close: vi.fn() }
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const error = vi.spyOn(toast, 'error')
    mockOrdersApi({
      'GET /orders/ord_DT-0000001/receipt': apiError(404, 'not_found'),
    })
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Invoice for order DT-0000001' }),
    )

    await waitFor(() => expect(tab.close).toHaveBeenCalled())
    expect(error).toHaveBeenCalledWith(
      'We could not get the invoice. Try again later.',
    )
  })

  it('links each order to its details', async () => {
    mockOrdersApi()
    await renderPage()

    expect(
      screen.getByRole('link', { name: 'Details of order DT-0000001' }),
    ).toHaveAttribute('href', '/orders/DT-0000001')
  })

  it('says so when there are no orders yet', async () => {
    mockApi({ 'GET /orders': { body: { items: [] } } })
    await renderWithProviders(<OrdersPage />)

    expect(
      await screen.findByText('You have not ordered anything yet.'),
    ).toBeVisible()
  })
})

describe('Pagination', () => {
  it('shows every page when they fit, and gaps when they do not', async () => {
    const onPageChange = vi.fn()
    const { rerender } = await renderWithProviders(
      <Pagination page={2} pageCount={4} onPageChange={onPageChange} />,
    )
    const pages = () =>
      screen
        .getAllByRole('button', { name: /^Page / })
        .map((b) => b.textContent)

    expect(pages()).toEqual(['1', '2', '3', '4'])

    rerender(<Pagination page={6} pageCount={12} onPageChange={onPageChange} />)
    expect(pages()).toEqual(['1', '5', '6', '7', '12'])
    expect(screen.getAllByText('…')).toHaveLength(2)
  })
})

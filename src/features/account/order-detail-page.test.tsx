import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { OrderDetailPage } from './order-detail-page'
import { ORDERS_SEARCH_DEFAULTS, useLastOrdersSearch } from './orders-search'
import { assetUrl } from '@/api/client'
import { apiError, mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const usd = (amount: number) => ({ amount, currency: 'USD' })
const line = (lineId: string, titleId: string, amount: number, qty = 1) => ({
  lineId,
  title: { id: titleId, cover: { url: `/img/${titleId}.jpg`, alt: '' } },
  formatLabel: 'PDF',
  qty,
  unitPrice: usd(amount),
})

const digitalOrder = {
  id: 'ord_DT-48213907',
  number: 'DT-48213907',
  placedAt: '2026-05-06T10:00:00Z',
  status: 'paid',
  lines: [
    line('ln_1', 'ttl_eberron', 1999),
    line('ln_2', 'ttl_vaesen', 499),
    line('ln_3', 'ttl_maps', 250, 2),
  ],
  totals: {
    subtotal: 2998,
    savings: 300,
    shipping: 0,
    tax: 0,
    total: 2698,
    currency: 'USD',
  },
  vatIncluded: 505,
  payment: { brand: 'visa', last4: '4242' },
  shippingAddress: null,
  shippingRate: null,
  digitalReady: true,
}

const titles: Record<string, { title: string; publisher: string }> = {
  ttl_eberron: {
    title: 'Exploring Eberron',
    publisher: 'Visionary Production and Design',
  },
  ttl_vaesen: {
    title: 'Vaesen: Mythic Carpathia',
    publisher: 'Free League Publishing',
  },
  ttl_maps: { title: 'Map Pack', publisher: 'Old Mill Publishing' },
}

/** Eberron has a new file (Download); Vaesen is in the library with nothing new; the map pack is not in it. */
const library = {
  items: [
    {
      id: 'lib_1',
      title: { id: 'ttl_eberron' },
      hasUpdate: false,
      files: [{ id: 'fil_eberron', name: 'eberron.pdf', isNew: true }],
    },
    {
      id: 'lib_2',
      title: { id: 'ttl_vaesen' },
      hasUpdate: false,
      files: [{ id: 'fil_vaesen', name: 'vaesen.pdf', isNew: false }],
    },
  ],
}

function mockOrderApi(
  order: object = digitalOrder,
  overrides: Record<string, Handler> = {},
) {
  const handlers: Record<string, Handler> = {
    'GET /me': { body: user },
    'GET /orders/DT-48213907': { body: order },
    'GET /library': { body: library },
    'GET /orders/ord_DT-48213907/receipt': {
      body: { pdfUrl: '/files/receipt.pdf' },
    },
    'POST /orders/ord_DT-48213907/resend-email': { status: 202, body: {} },
    'GET /library/files/fil_eberron/download': {
      body: { url: '/files/eberron.pdf', expiresAt: '2026-10-10T20:00:00Z' },
    },
  }
  for (const [id, { title, publisher }] of Object.entries(titles)) {
    handlers[`GET /titles/${id}`] = {
      body: { id, title, publisher: { id: 'pub', name: publisher } },
    }
  }
  return mockApi({ ...handlers, ...overrides })
}

async function renderPage() {
  const result = await renderWithProviders(
    <OrderDetailPage orderId="DT-48213907" />,
  )
  await screen.findByRole('heading', { level: 1, name: 'Order DT-48213907' })
  return result
}

const fakeTab = () => ({ opener: {}, location: { href: '' }, close: vi.fn() })

describe('OrderDetailPage', () => {
  it('shows the order, its progress and the payment summary', async () => {
    mockOrderApi()
    await renderPage()

    // the status badge next to the title
    expect(
      screen.getByRole('heading', { level: 1 }).parentElement,
    ).toHaveTextContent('Order DT-48213907Paid')
    expect(screen.getByText('Placed May 6, 2026 · 4 items')).toBeVisible()

    const steps = within(
      screen.getByRole('list', { name: 'Order progress' }),
    ).getAllByRole('listitem')
    // a digital order: no "Shipped" step
    expect(steps.map((step) => step.textContent)).toEqual([
      'Placed (done)',
      'Paid (done)',
      'In your library (done)',
    ])

    const summary = screen.getByRole('region', { name: 'Payment summary' })
    expect(within(summary).getByText('−$3.00')).toBeVisible()
    expect(within(summary).getByText('$26.98')).toBeVisible()
    expect(within(summary).getByText('Includes VAT of $5.05')).toBeVisible()
    expect(within(summary).getByText('Visa ••4242')).toBeVisible()
    // no shipping cost, no address on a digital order
    expect(within(summary).queryByText('Shipping')).toBeNull()
    expect(within(summary).queryByText('Shipping to')).toBeNull()

    expect(await screen.findByText('Map Pack')).toBeVisible()
    expect(screen.getByText('$5.00')).toBeVisible() // 2 × $2.50
  })

  it('offers Download, In library, or nothing, from the library', async () => {
    mockOrderApi()
    await renderPage()

    expect(
      await screen.findByRole('button', { name: 'Download Exploring Eberron' }),
    ).toBeVisible()
    expect(
      await screen.findByRole('link', {
        name: 'Vaesen: Mythic Carpathia is in your library',
      }),
    ).toHaveAttribute('href', '/library')
    // not in the library (e.g. print only): no button
    const items = within(
      screen.getByRole('list', { name: 'Items in this order' }),
    )
    const mapRow = items
      .getAllByRole('listitem')
      .find((row) => within(row).queryByText('Map Pack')) as HTMLElement
    expect(within(mapRow).queryByRole('button')).toBeNull()
    expect(within(mapRow).queryByRole('link')).toBeNull()
  })

  it('downloads the new file in a new tab', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    mockOrderApi()
    const { user: u } = await renderPage()

    await u.click(
      await screen.findByRole('button', { name: 'Download Exploring Eberron' }),
    )

    await waitFor(() =>
      expect(tab.location.href).toBe(assetUrl('/files/eberron.pdf')),
    )
  })

  it('opens the invoice and emails the receipt', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const success = vi.spyOn(toast, 'success')
    const { bodies } = mockOrderApi()
    const { user: u } = await renderPage()

    await u.click(
      screen.getByRole('button', { name: 'Download invoice (PDF)' }),
    )
    await waitFor(() =>
      expect(tab.location.href).toBe(assetUrl('/files/receipt.pdf')),
    )

    await u.click(screen.getByRole('button', { name: 'Email me the receipt' }))
    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        `We sent the receipt to ${user.email}.`,
      ),
    )
    expect(bodies('POST /orders/ord_DT-48213907/resend-email')).toHaveLength(1)
  })

  it('says so when the receipt cannot be emailed', async () => {
    const error = vi.spyOn(toast, 'error')
    mockOrderApi(digitalOrder, {
      'POST /orders/ord_DT-48213907/resend-email': apiError(503, 'unavailable'),
    })
    const { user: u } = await renderPage()

    await u.click(screen.getByRole('button', { name: 'Email me the receipt' }))

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'We could not send the receipt. Try again later.',
      ),
    )
  })

  it('adds shipping for physical orders', async () => {
    mockOrderApi({
      ...digitalOrder,
      status: 'paid',
      totals: { ...digitalOrder.totals, shipping: 699 },
      shippingAddress: {
        fullName: 'Arya Stark',
        line1: 'ul. Przykładowa 12/4',
        line2: null,
        city: 'Warszawa',
        postalCode: '00-001',
        country: 'PL',
      },
      shippingRate: { label: 'Standard', eta: '5-8 business days' },
    })
    await renderPage()

    const steps = within(
      screen.getByRole('list', { name: 'Order progress' }),
    ).getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toContain('Shipped (not yet)')
    const summary = screen.getByRole('region', { name: 'Payment summary' })
    expect(within(summary).getByText('$6.99')).toBeVisible()
    expect(within(summary).getByText(/00-001 Warszawa/)).toBeVisible()
    expect(within(summary).getByText(/Poland/)).toBeVisible()
    expect(
      within(summary).getByText('Standard · 5-8 business days'),
    ).toBeVisible()
  })

  it('shows Shipped as done when the API says so, even without an address', async () => {
    mockOrderApi({ ...digitalOrder, status: 'shipped' })
    await renderPage()

    const steps = within(
      screen.getByRole('list', { name: 'Order progress' }),
    ).getAllByRole('listitem')
    expect(steps.map((step) => step.textContent)).toContain('Shipped (done)')
  })

  it('says so when the order does not exist', async () => {
    mockApi({ 'GET /orders/DT-0000000': apiError(404, 'not_found') })
    await renderWithProviders(<OrderDetailPage orderId="DT-0000000" />)

    expect(
      await screen.findByRole('heading', {
        name: 'We could not find this order.',
      }),
    ).toBeVisible()
    const back = screen.getByRole('link', { name: 'Orders' })
    expect(new URL(back.getAttribute('href') ?? '', 'http://x').pathname).toBe(
      '/orders',
    )
  })

  it('goes back to the order list as the user left it', async () => {
    useLastOrdersSearch.setState({
      search: { ...ORDERS_SEARCH_DEFAULTS, period: 'all', page: 2 },
    })
    mockOrderApi()
    await renderPage()

    const back = screen.getByRole('link', { name: 'Orders' })
    const href = new URL(back.getAttribute('href') ?? '', 'http://x')
    expect(href.pathname).toBe('/orders')
    expect(href.searchParams.get('period')).toBe('all')
    expect(href.searchParams.get('page')).toBe('2')

    useLastOrdersSearch.setState({ search: ORDERS_SEARCH_DEFAULTS })
  })
})

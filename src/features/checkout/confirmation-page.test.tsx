import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { ConfirmationPage } from './confirmation-page'
import { useCheckoutResult } from '@/stores/checkout-result'
import { apiError, mockApi, usd, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

afterEach(() => useCheckoutResult.setState({ result: null }))

const order = (guest: boolean) => ({
  id: 'ord_DT-1',
  number: 'DT-1',
  placedAt: '2026-10-12T10:00:00Z',
  status: 'paid',
  lines: [
    {
      lineId: 'ln_1',
      title: { id: 'ttl_imperium', name: 'Imperium Maledictum', cover: null },
      formatLabel: 'PDF',
      qty: 1,
      unitPrice: usd(1999),
    },
    {
      lineId: 'ln_2',
      title: { id: 'ttl_vaesen', name: 'Vaesen', cover: null },
      formatLabel: 'Hardcover + PDF',
      qty: 1,
      unitPrice: usd(4499),
    },
  ],
  totals: {
    subtotal: 6998,
    savings: 500,
    shipping: 699,
    tax: 0,
    total: 7197,
    currency: 'USD',
  },
  vatIncluded: 1346,
  payment: { brand: 'visa', last4: '4242' },
  shippingAddress: null,
  shippingRate: { label: 'Standard', eta: '5-8 business days' },
  digitalReady: true,
  guest,
})

function mockOrder(guest: boolean, overrides: Record<string, Handler> = {}) {
  return mockApi({
    'GET /me': guest ? apiError(401, 'unauthorized') : { body: user },
    'GET /orders/DT-1': { body: order(guest) },
    'GET /library': { body: { items: [] } },
    ...overrides,
  })
}

async function renderConfirmation() {
  const result = await renderWithProviders(<ConfirmationPage orderId="DT-1" />)
  await screen.findByRole('heading', {
    level: 1,
    name: 'Thanks, your order is confirmed',
  })
  return result
}

describe('ConfirmationPage', () => {
  it('leads with the result, the facts and the downloads', async () => {
    useCheckoutResult.setState({
      result: {
        number: 'DT-1',
        email: 'arya@example.com',
        shippedTitleIds: ['ttl_vaesen'],
      },
    })
    mockOrder(false)
    await renderConfirmation()

    expect(screen.getByText('arya@example.com')).toBeVisible()
    expect(
      screen.getByText(/Your PDFs are ready to download now\./),
    ).toBeVisible()
    expect(screen.getByText('DT-1')).toBeVisible()
    expect(screen.getByText('$71.97')).toBeVisible()
    expect(screen.getByText('Visa ending 4242')).toBeVisible()

    const [pdf, hardcover] = screen.getAllByRole('listitem')
    expect(within(pdf).getByText('PDF ready to download')).toBeVisible()
    expect(within(pdf).queryByText(/ships/)).toBeNull()
    expect(within(hardcover).getByText('PDF ready to download')).toBeVisible()
    expect(
      within(hardcover).getByText(
        'Printed copy ships in 5-8 business days. Tracking by email.',
      ),
    ).toBeVisible()

    expect(
      await screen.findByRole('link', { name: 'Go to my Library' }),
    ).toHaveAttribute('href', '/library')
    expect(
      screen.getByRole('link', { name: 'View order details' }),
    ).toHaveAttribute('href', '/orders/DT-1')
    expect(
      screen.queryByRole('region', { name: 'Keep these in your Library' }),
    ).toBeNull()
  })

  it('lets a guest keep the titles in a new account', async () => {
    const { bodies } = mockOrder(true, {
      'POST /orders/ord_DT-1/create-account': { status: 201, body: {} },
    })
    const { user: u } = await renderConfirmation()

    // without the checkout's memory (a reload): no email to name
    expect(
      screen.getByText(/We sent the receipt to your email\./),
    ).toBeVisible()
    const keep = screen.getByRole('region', {
      name: 'Keep these in your Library',
    })
    expect(
      await screen.findByRole('link', { name: 'Skip and continue shopping' }),
    ).toBeVisible()
    const password = within(keep).getByLabelText('Choose a password')

    await u.type(password, 'short')
    await u.click(within(keep).getByRole('button', { name: 'Create account' }))
    expect(
      await within(keep).findByText('Use at least 10 characters.'),
    ).toBeVisible()
    expect(bodies('POST /orders/ord_DT-1/create-account')).toHaveLength(0)

    await u.clear(password)
    await u.type(password, 'a-long-password')
    await u.click(within(keep).getByRole('button', { name: 'Create account' }))

    expect(
      await within(keep).findByText(
        'Your account is ready. Log in to open your Library.',
      ),
    ).toBeVisible()
    expect(bodies('POST /orders/ord_DT-1/create-account')).toEqual([
      { password: 'a-long-password' },
    ])
    expect(
      screen.getByRole('link', { name: 'Skip and continue shopping' }),
    ).toHaveAttribute('href', '/')
    expect(
      screen.getByRole('button', { name: 'Download receipt' }),
    ).toBeVisible()
  })

  it('says when the order cannot be found', async () => {
    mockOrder(false, { 'GET /orders/DT-1': apiError(404, 'not_found') })
    await renderWithProviders(<ConfirmationPage orderId="DT-1" />)

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'We could not find this order.' }),
      ).toBeVisible(),
    )
  })
})

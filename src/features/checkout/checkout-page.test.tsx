import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { CheckoutPage } from './checkout-page'
import type { CartLine } from '@/api/cart'
import { useCheckoutResult } from '@/stores/checkout-result'
import { apiError, mockApi, usd, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const pdf: CartLine = {
  lineId: 'ln_1',
  title: { id: 'ttl_imperium', name: 'Imperium Maledictum', cover: null },
  sku: 'sku_imperium_pdf',
  formatLabel: 'PDF',
  qty: 1,
  unitPrice: usd(1999),
  listPrice: usd(2499),
  requiresShipping: false,
  alreadyOwned: false,
}
const print: CartLine = {
  lineId: 'ln_2',
  title: { id: 'ttl_vaesen', name: 'Vaesen', cover: null },
  sku: 'sku_vaesen_print',
  formatLabel: 'Hardcover + PDF',
  qty: 1,
  unitPrice: usd(4499),
  listPrice: usd(4499),
  requiresShipping: true,
  alreadyOwned: false,
}

const rates = [
  { id: 'std', label: 'Standard', eta: '5-8 business days', price: usd(699) },
  { id: 'exp', label: 'Express', eta: '2-3 business days', price: usd(1499) },
]

function session(
  lines: Array<CartLine>,
  rate: (typeof rates)[number] | null = null,
) {
  const goods = lines.reduce((sum, line) => sum + line.unitPrice.amount, 0)
  return {
    id: 'chk_1',
    cart: {
      id: 'crt_1',
      lines,
      promo: null,
      gift: { enabled: false },
      totals: {
        subtotal: usd(goods + 500),
        saleSavings: usd(500),
        promoDiscount: usd(0),
        total: usd(goods),
        taxAndShippingNote: 'Calculated at checkout',
      },
    },
    contactEmail: null,
    shippingAddress: null,
    shippingRate: rate,
    taxRate: 0.23,
    vatIncluded: usd(1000),
    total: usd(goods + (rate?.price.amount ?? 0)),
    requiresShipping: lines.some((line) => line.requiresShipping),
  }
}

const guestMe = apiError(401, 'unauthorized')

function mockCheckout(
  lines: Array<CartLine>,
  me: Handler,
  overrides: Record<string, Handler> = {},
) {
  return mockApi({
    'GET /me': me,
    'POST /checkout': { status: 201, body: session(lines) },
    'GET /checkout/chk_1/shipping-rates': { body: rates },
    'PUT /checkout/chk_1/shipping-rate': ({ body }) => ({
      body: session(
        lines,
        rates.find((rate) => rate.id === (body as { rateId: string }).rateId),
      ),
    }),
    'PUT /checkout/chk_1/contact': { body: session(lines) },
    'PUT /checkout/chk_1/shipping-address': { body: session(lines) },
    'PUT /checkout/chk_1/billing-address': { body: session(lines) },
    'POST /checkout/chk_1/payment-intent': { body: { clientSecret: 'pi_1' } },
    'POST /checkout/chk_1/place-order': {
      status: 201,
      body: { id: 'ord_1', number: 'DT-1' },
    },
    'GET /account/addresses': { body: [] },
    'GET /account/payment-methods': { body: [] },
    ...overrides,
  })
}

async function renderCheckout() {
  const result = await renderWithProviders(<CheckoutPage />)
  await screen.findByRole('region', { name: 'Payment' })
  return result
}

const pay = () => screen.getByRole('button', { name: /^Pay / })

async function fillGuest(
  u: Awaited<ReturnType<typeof renderCheckout>>['user'],
  card = '4242 4242 4242 4242',
) {
  await u.type(
    screen.getByRole('textbox', { name: 'Email' }),
    'you@example.com',
  )
  await u.type(screen.getByRole('textbox', { name: 'First name' }), 'Jan')
  await u.type(screen.getByRole('textbox', { name: 'Last name' }), 'Kowalski')
  await u.type(screen.getByRole('textbox', { name: 'Address' }), 'ul. Prosta 1')
  await u.type(screen.getByRole('textbox', { name: 'Postal code' }), '00-001')
  await u.type(screen.getByRole('textbox', { name: 'City' }), 'Warszawa')
  await u.type(screen.getByRole('textbox', { name: 'Card number' }), card)
  await u.type(screen.getByRole('textbox', { name: 'Expiry' }), '08/30')
  await u.type(screen.getByRole('textbox', { name: 'Security code' }), '123')
}

describe('CheckoutPage', () => {
  it('says what is missing before paying', async () => {
    const { bodies } = mockCheckout([pdf], guestMe)
    const { user: u } = await renderCheckout()

    await u.click(pay())

    expect(await screen.findByText('Enter your email address.')).toBeVisible()
    expect(screen.getByText('Enter your first name.')).toBeVisible()
    expect(screen.getByText('Enter a valid card number.')).toBeVisible()
    expect(bodies('POST /checkout/chk_1/place-order')).toHaveLength(0)
  })

  it('takes a guest from the form to the confirmation', async () => {
    const { bodies } = mockCheckout([pdf, print], guestMe)
    const { user: u, router } = await renderCheckout()

    // printed items: Standard is chosen, and in the total
    await waitFor(() =>
      expect(bodies('PUT /checkout/chk_1/shipping-rate')).toEqual([
        { rateId: 'std' },
      ]),
    )
    expect(await screen.findByText('Shipping (Standard)')).toBeInTheDocument()
    await u.click(screen.getByRole('radio', { name: /Express/ }))
    expect(await screen.findByText('Shipping (Express)')).toBeInTheDocument()
    expect(pay()).toHaveTextContent('Pay $79.97')

    await fillGuest(u)
    await u.click(pay())

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/order-confirmation/DT-1'),
    )
    expect(bodies('PUT /checkout/chk_1/contact')).toEqual([
      { email: 'you@example.com' },
    ])
    const address = {
      fullName: 'Jan Kowalski',
      line1: 'ul. Prosta 1',
      city: 'Warszawa',
      postalCode: '00-001',
      country: 'PL',
    }
    expect(bodies('PUT /checkout/chk_1/shipping-address')).toEqual([address])
    expect(bodies('PUT /checkout/chk_1/billing-address')).toEqual([address])
    expect(bodies('POST /checkout/chk_1/place-order')).toEqual([
      { paymentMethodId: 'pm_card_new' },
    ])
    expect(useCheckoutResult.getState().result).toEqual({
      number: 'DT-1',
      email: 'you@example.com',
      shippedTitleIds: ['ttl_vaesen'],
    })
  })

  it('says when the card is declined, and that nothing was charged', async () => {
    mockCheckout([pdf], guestMe, {
      'POST /checkout/chk_1/place-order': apiError(402, 'payment_declined'),
    })
    const { user: u, router } = await renderCheckout()

    await fillGuest(u, '4000 0000 0000 0002')
    await u.click(pay())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Payment didn’t go through')
    expect(alert).toHaveTextContent('Nothing was charged.')
    expect(alert).toHaveFocus()
    expect(screen.getByText('Your card was declined.')).toBeVisible()
    expect(router.state.location.pathname).toBe('/')
  })

  it('uses an account’s saved details', async () => {
    const { bodies } = mockCheckout(
      [pdf],
      { body: user },
      {
        'GET /account/addresses': {
          body: [
            {
              id: 'adr_1',
              fullName: 'Arya Stark',
              line1: 'ul. Przykładowa 12/4',
              line2: null,
              city: 'Warszawa',
              postalCode: '00-001',
              country: 'PL',
              isDefault: true,
            },
          ],
        },
        'GET /account/payment-methods': {
          body: [
            {
              id: 'pm_1',
              brand: 'visa',
              last4: '4242',
              expMonth: 8,
              expYear: 2028,
              isDefault: true,
            },
          ],
        },
      },
    )
    const { user: u, router } = await renderCheckout()

    const contact = screen.getByRole('region', { name: 'Contact' })
    expect(within(contact).getByText('test@example.com')).toBeVisible()
    expect(screen.getByText('Arya Stark')).toBeVisible()
    expect(screen.getByText('Visa ending 4242')).toBeVisible()
    expect(screen.getByText('Expires 08/28')).toBeVisible()
    expect(screen.queryByRole('textbox', { name: 'Card number' })).toBeNull()

    await u.click(pay())

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/order-confirmation/DT-1'),
    )
    expect(bodies('PUT /checkout/chk_1/contact')).toEqual([
      { email: 'test@example.com' },
    ])
    expect(bodies('POST /checkout/chk_1/place-order')).toEqual([
      { paymentMethodId: 'pm_1' },
    ])
  })

  it('folds the summary into one line on phones', async () => {
    mockCheckout([pdf], guestMe)
    const { user: u } = await renderCheckout()

    const toggle = screen.getByRole('button', { name: /Show order summary/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await u.click(toggle)
    expect(
      screen.getByRole('button', { name: /Hide order summary/ }),
    ).toHaveAttribute('aria-expanded', 'true')
  })

  it('has nothing to pay for with an empty cart', async () => {
    mockCheckout([], guestMe)
    await renderWithProviders(<CheckoutPage />)

    expect(
      await screen.findByText(
        'Your cart is empty, so there is nothing to check out.',
      ),
    ).toBeVisible()
  })
})

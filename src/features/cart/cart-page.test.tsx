import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { CartPage } from './cart-page'
import type { Cart, CartLine } from '@/api/cart'
import { apiError, mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const usd = (amount: number) => ({ amount, currency: 'USD' })

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

function cartOf(lines: Array<CartLine>, extra: Partial<Cart> = {}): Cart {
  const subtotal = lines.reduce(
    (sum, line) => sum + (line.listPrice?.amount ?? 0) * line.qty,
    0,
  )
  const total = lines.reduce(
    (sum, line) => sum + line.unitPrice.amount * line.qty,
    0,
  )
  return {
    id: 'crt_1',
    lines,
    savedForLater: [],
    promo: null,
    gift: { enabled: false },
    totals: {
      subtotal: usd(subtotal),
      saleSavings: usd(subtotal - total),
      promoDiscount: usd(0),
      total: usd(total),
      taxAndShippingNote: 'Calculated at checkout',
    },
    ...extra,
  }
}

const summaryOf = (id: string, publisher: string) => ({
  body: {
    id,
    title: id,
    publisher: { id: `pub_${id}`, name: publisher },
  },
})

function mockCart(cart: Cart, overrides: Record<string, Handler> = {}) {
  return mockApi({
    'GET /me': { body: user },
    'GET /cart': { body: cart },
    'GET /cart/recommendations': { body: [] },
    'GET /titles/ttl_imperium': summaryOf('ttl_imperium', 'Cubicle 7'),
    'GET /titles/ttl_vaesen': summaryOf('ttl_vaesen', 'Free League'),
    ...overrides,
  })
}

async function renderCart() {
  const result = await renderWithProviders(<CartPage />)
  await screen.findByRole('heading', { level: 1, name: /Shopping cart/ })
  return result
}

const lines = () => screen.getByRole('list', { name: 'Shopping cart' })
const summary = () => screen.getByRole('region', { name: 'Order summary' })

describe('CartPage', () => {
  it('lists each line with its publisher, format, delivery and price', async () => {
    mockCart(cartOf([pdf, print]))
    await renderCart()

    expect(
      screen.getByRole('heading', { level: 1, name: 'Shopping cart 2 items' }),
    ).toBeVisible()
    const items = within(lines()).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(await within(items[0]).findByText('Cubicle 7')).toBeVisible()
    expect(within(items[0]).getByText('Instant download')).toBeVisible()
    expect(within(items[0]).getAllByText('-20%')[0]).toBeInTheDocument()
    expect(within(items[1]).getByText('Ships to you')).toBeVisible()

    expect(within(summary()).getByText('Subtotal (2 items)')).toBeVisible()
    expect(within(summary()).getByText('-$5.00')).toBeVisible()
    expect(within(summary()).getByText('$64.98')).toBeVisible()
    expect(
      within(summary()).getByRole('link', { name: 'Proceed to checkout' }),
    ).toHaveAttribute('href', '/checkout')
  })

  it('changes the quantity of a printed line', async () => {
    const { bodies } = mockCart(cartOf([pdf, print]), {
      'PATCH /cart/items/ln_2': { body: cartOf([pdf, { ...print, qty: 2 }]) },
    })
    const { user: u } = await renderCart()

    // a download has no quantity to change
    expect(
      screen.queryByRole('button', { name: 'One more Imperium Maledictum' }),
    ).toBeNull()
    await u.click(screen.getAllByRole('button', { name: 'One more Vaesen' })[0])

    expect(bodies('PATCH /cart/items/ln_2')).toEqual([{ qty: 2 }])
    await waitFor(() =>
      expect(
        screen.getAllByRole('status', { name: 'Quantity of Vaesen' })[0],
      ).toHaveTextContent('2'),
    )
  })

  it('removes a line, with Undo', async () => {
    const success = vi.spyOn(toast, 'success')
    const { bodies } = mockCart(cartOf([pdf, print]), {
      'DELETE /cart/items/ln_1': {
        body: cartOf([print], { undoToken: 'undo_1' }),
      },
      'POST /cart/undo': { body: cartOf([pdf, print]) },
    })
    const { user: u } = await renderCart()

    await u.click(
      screen.getAllByRole('button', { name: 'Remove Imperium Maledictum' })[0],
    )

    await waitFor(() =>
      expect(within(lines()).getAllByRole('listitem')).toHaveLength(1),
    )
    const [text, options] = success.mock.calls[0]
    expect(text).toBe('Imperium Maledictum was removed from your cart.')
    const action = options?.action as { label: string; onClick: () => void }
    expect(action.label).toBe('Undo')
    action.onClick()
    await waitFor(() =>
      expect(bodies('POST /cart/undo')).toEqual([{ undoToken: 'undo_1' }]),
    )
    await waitFor(() =>
      expect(within(lines()).getAllByRole('listitem')).toHaveLength(2),
    )
  })

  it('applies a promo code, and says why one is refused', async () => {
    const withPromo = cartOf([pdf], {
      promo: { code: 'WELCOME10', percentOff: 10, discount: usd(200) },
    })
    mockCart(cartOf([pdf]), {
      'POST /cart/promo': ({ body }) =>
        (body as { code: string }).code === 'WELCOME10'
          ? { body: withPromo }
          : apiError(422, 'promo_expired', { field: 'code' }),
    })
    const { user: u } = await renderCart()
    const code = within(summary()).getByRole('textbox', { name: 'Promo code' })

    await u.type(code, 'expired5')
    await u.click(within(summary()).getByRole('button', { name: 'Apply' }))
    expect(
      await within(summary()).findByText('This promo code has expired.'),
    ).toBeVisible()

    await u.clear(code)
    await u.type(code, 'welcome10')
    await u.click(within(summary()).getByRole('button', { name: 'Apply' }))
    expect(
      await within(summary()).findByText('Promo code WELCOME10'),
    ).toBeVisible()
    expect(within(summary()).getByText('-$2.00')).toBeVisible()
  })

  it('makes it a gift, and checks out once the recipient’s email is in', async () => {
    let gift: Cart['gift'] = { enabled: false }
    const { bodies } = mockCart(cartOf([pdf]), {
      'PUT /cart/gift': ({ body }) => {
        gift = body as Cart['gift']
        return { body: cartOf([pdf], { gift }) }
      },
    })
    const { user: u } = await renderCart()

    await u.click(screen.getByRole('switch', { name: 'This order is a gift' }))
    expect(bodies('PUT /cart/gift')[0]).toEqual({ enabled: true })
    const checkout = await within(summary()).findByRole('button', {
      name: 'Proceed to checkout',
    })
    expect(checkout).toBeDisabled()
    expect(
      within(summary()).getByText(
        "Add the recipient's email to send this gift.",
      ),
    ).toBeVisible()

    const email = screen.getByRole('textbox', { name: 'Recipient email' })
    await u.type(email, 'not-an-email')
    await u.tab()
    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeVisible()
    expect(bodies('PUT /cart/gift')).toHaveLength(1)

    await u.clear(email)
    await u.type(email, 'jon@snow.com')
    await u.type(
      screen.getByRole('textbox', { name: 'Recipient name' }),
      'Jon Snow',
    )
    await u.tab()

    await waitFor(() =>
      expect(bodies('PUT /cart/gift').at(-1)).toEqual({
        enabled: true,
        recipientEmail: 'jon@snow.com',
        recipientName: 'Jon Snow',
      }),
    )
    expect(
      await within(summary()).findByRole('link', {
        name: 'Proceed to checkout',
      }),
    ).toHaveAttribute('href', '/checkout')
  })

  it('suggests more titles, each with Add', async () => {
    mockCart(cartOf([pdf]), {
      'GET /cart/recommendations': {
        body: [
          {
            id: 'ttl_dawn',
            title: 'Until Dawn',
            publisher: null,
            cover: null,
            type: null,
            ruleSystem: null,
            formats: ['pdf'],
            price: usd(399),
            listPrice: usd(399),
            onSale: false,
            rating: null,
            owned: false,
            inWishlist: false,
            textLanguage: 'en',
          },
        ],
      },
    })
    await renderCart()

    const shelf = await screen.findByRole('region', {
      name: 'Customers also bought',
    })
    expect(
      within(shelf).getByRole('link', { name: 'Until Dawn' }),
    ).toHaveAttribute('href', '/titles/ttl_dawn')
    expect(
      within(shelf).getByRole('button', { name: 'Add to Cart: Until Dawn' }),
    ).toHaveTextContent('Add')
  })

  it('says when the cart is empty, and brings back what was saved for later', async () => {
    const { bodies } = mockCart(
      { ...cartOf([]), savedForLater: [print] },
      {
        'POST /cart/saved/ln_2/move-to-cart': { body: {} },
      },
    )
    const { user: u } = await renderWithProviders(<CartPage />)

    expect(
      await screen.findByRole('heading', { name: 'Your cart is empty' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Continue shopping' }),
    ).toHaveAttribute('href', '/titles')
    const saved = screen.getByRole('list', { name: 'Saved for later · 1' })
    expect(within(saved).getByText('Vaesen')).toBeVisible()

    await u.click(
      within(saved).getByRole('button', { name: 'Move Vaesen to cart' }),
    )
    expect(bodies('POST /cart/saved/ln_2/move-to-cart')).toHaveLength(1)
  })
})

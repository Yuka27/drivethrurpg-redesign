import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { TitlePreviewPanel } from './title-preview'
import type { TitlePreview } from '@/api/titles'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { apiError, mockApi, never, usd, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { pdfEdition, previewOf } from '@/test/preview'
import { renderWithProviders } from '@/test/render'

function mockPreview(
  preview: TitlePreview,
  overrides: Record<string, Handler> = {},
  me: Handler = { body: user },
) {
  return mockApi({
    'GET /me': me,
    [`GET /titles/${preview.id}/preview`]: { body: preview },
    'POST /cart/items': { body: {} },
    ...overrides,
  })
}

async function renderPanel(id = 'ttl_mm') {
  const result = await renderWithProviders(<TitlePreviewPanel titleId={id} />)
  const panel = await screen.findByRole('complementary', {
    name: /^Preview: /,
  })
  return { ...result, panel }
}

const buy = () =>
  screen.getByRole('button', { name: /Add to Cart|Get it free|Pre-order/ })

describe('TitlePreviewPanel', () => {
  it('asks for three sample pages, and outlines itself meanwhile', async () => {
    const { params } = mockPreview(previewOf('ttl_mm'), {
      'GET /titles/ttl_mm/preview': never,
    })
    await renderWithProviders(<TitlePreviewPanel titleId="ttl_mm" />)

    expect(await screen.findByText('Loading…')).toHaveAttribute(
      'role',
      'status',
    )
    expect(params('GET /titles/ttl_mm/preview')[0]?.get('pages')).toBe('3')
  })

  it('shows the title, its publisher alone, rating and tags', async () => {
    mockPreview(previewOf('ttl_mm'))
    const { panel } = await renderPanel()

    expect(
      within(panel).getByRole('heading', { name: 'Title ttl_mm' }),
    ).toBeVisible()
    expect(within(panel).getByText('DMs Guild creators')).toBeVisible()
    expect(within(panel).queryByText(/^By /)).toBeNull()
    expect(within(panel).getByText('Very Positive')).toBeVisible()
    expect(within(panel).getByText('(214)')).toBeVisible()
    // the system's name from the API, not its id
    expect(
      within(panel)
        .getAllByRole('listitem')
        .slice(0, 3)
        .map((tag) => tag.textContent),
    ).toEqual(['Bestiary', 'D&D 5E', 'Fantasy'])
  })

  it('shows the facts and badges', async () => {
    mockPreview(previewOf('ttl_mm'))
    const { panel } = await renderPanel()

    const facts = Object.fromEntries(
      within(panel)
        .getAllByRole('term')
        .map((term) => [
          term.textContent,
          term.nextElementSibling?.textContent,
        ]),
    )
    expect(facts).toEqual({
      Pages: '256',
      Format: 'PDF',
      Language: 'English',
      Released: 'Jul 22, 2025',
    })
    expect(within(panel).getByText('Human-created, no AI')).toBeVisible()
    expect(
      within(panel).getByText('Instant download', { selector: 'li' }),
    ).toBeVisible()
  })

  it('shows one whole sample, switched by its thumbnails', async () => {
    mockPreview(previewOf('ttl_mm'))
    const { panel, user: u } = await renderPanel()

    const big = within(panel).getByRole('img', { name: 'Contents' })
    expect(big).toHaveClass('object-contain')
    expect(big.parentElement).toHaveClass('aspect-[3/2]')
    expect(within(panel).getByText('Sample 1 of 3')).toBeVisible()
    // with samples, no cover by the name
    expect(within(panel).queryByRole('img', { name: /cover$/ })).toBeNull()

    await u.hover(within(panel).getByRole('button', { name: 'Sample page 2' }))
    expect(
      within(panel).getByRole('img', { name: 'The aboleth' }),
    ).toBeVisible()
    expect(within(panel).getByText('Sample 2 of 3')).toBeVisible()
    expect(
      within(panel).getByRole('button', { name: 'Sample page 2' }),
    ).toHaveAttribute('aria-pressed', 'true')

    // more pages than shown: to the product page's samples
    expect(
      within(panel).getByRole('link', { name: 'See all 5 pages' }),
    ).toHaveAttribute('href', '/titles/ttl_mm#samples')
  })

  it('shows a small whole cover and no big image without samples', async () => {
    mockPreview(previewOf('ttl_mm', { previewPages: [], previewPageTotal: 0 }))
    const { panel } = await renderPanel()

    const cover = within(panel).getByRole('img', { name: 'Title ttl_mm cover' })
    expect(cover).toHaveClass('w-16', 'object-contain')
    // the stars are an img role too: count the pictures
    expect(
      within(panel)
        .getAllByRole('img')
        .filter((image) => image.tagName === 'IMG'),
    ).toEqual([cover])
    expect(within(panel).queryByText(/^Sample /)).toBeNull()
    expect(within(panel).queryByRole('link', { name: /^See all/ })).toBeNull()
  })

  it('preselects the default edition, and the button follows the choice', async () => {
    const { bodies } = mockPreview(previewOf('ttl_mm'))
    const { panel, user: u } = await renderPanel()

    const editions = within(panel).getByRole('radiogroup', { name: 'Edition' })
    const [pdf, print] = within(editions).getAllByRole('radio')
    expect(pdf).toHaveAttribute('aria-checked', 'true')
    expect(buy()).toHaveTextContent('Add to Cart · $24.99')
    // the list price struck through on sale, low stock on its row
    expect(within(print).getByText('$54.99').tagName).toBe('S')
    expect(within(print).getByText('Only 3 left')).toHaveClass('text-warning')

    await u.click(print)
    expect(print).toHaveAttribute('aria-checked', 'true')
    expect(buy()).toHaveTextContent('Add to Cart · $49.99')
    // the format fact is the chosen edition's
    expect(
      within(panel).getByText('Hardcover + PDF', { selector: 'dd' }),
    ).toBeVisible()

    await u.click(buy())
    await waitFor(() =>
      expect(bodies('POST /cart/items')).toEqual([
        { sku: 'sku_print', qty: 1 },
      ]),
    )
  })

  it('moves the choice with the arrow keys, one Tab stop', async () => {
    mockPreview(previewOf('ttl_mm'))
    const { panel, user: u } = await renderPanel()
    const [pdf, print] = within(panel).getAllByRole('radio')
    expect(pdf).toHaveAttribute('tabindex', '0')
    expect(print).toHaveAttribute('tabindex', '-1')

    pdf.focus()
    await u.keyboard('{ArrowDown}')
    expect(print).toHaveFocus()
    expect(print).toHaveAttribute('aria-checked', 'true')
    expect(buy()).toHaveTextContent('$49.99')
    await u.keyboard('{ArrowDown}')
    expect(pdf).toHaveAttribute('aria-checked', 'true')
  })

  it('shows a single edition as one row, without a choice', async () => {
    mockPreview(
      previewOf('ttl_mm', { editions: [pdfEdition({ onSale: false })] }),
    )
    const { panel } = await renderPanel()

    expect(within(panel).queryByRole('radiogroup')).toBeNull()
    expect(within(panel).queryByRole('radio')).toBeNull()
    // the row still says what the buyer gets
    const row = within(panel).getByText('PDF', {
      selector: 'span',
    }).parentElement
    expect(row).toHaveTextContent('PDFInstant download')
  })

  it('offers a free title as "Get it free"', async () => {
    mockPreview(
      previewOf('ttl_mm', {
        editions: [pdfEdition({ price: usd(0), onSale: false })],
      }),
    )
    await renderPanel()

    expect(buy()).toHaveTextContent('Get it free')
  })

  it('pre-orders a title not out yet', async () => {
    mockPreview(previewOf('ttl_mm', { upcoming: true }))
    await renderPanel()

    expect(buy()).toHaveTextContent('Pre-order · $24.99')
  })

  it('sends an owner to the library instead of the cart', async () => {
    mockPreview(previewOf('ttl_mm', { owned: true }))
    const { panel } = await renderPanel()

    expect(
      within(panel).getByRole('link', { name: 'In your library' }),
    ).toHaveAttribute('href', '/library')
    expect(
      within(panel).queryByRole('button', { name: /Add to Cart/ }),
    ).toBeNull()
    expect(within(panel).queryByRole('radiogroup')).toBeNull()
  })

  it('sells nothing once the title is withdrawn', async () => {
    mockPreview(previewOf('ttl_mm', { available: false }))
    const { panel } = await renderPanel()

    expect(
      within(panel).getByRole('button', { name: 'No longer available' }),
    ).toBeDisabled()
    expect(within(panel).queryByRole('radiogroup')).toBeNull()
  })

  it('asks a guest to log in from the heart', async () => {
    const { bodies } = mockPreview(
      previewOf('ttl_mm'),
      {},
      apiError(401, 'unauthorized'),
    )
    const { panel, user: u } = await renderPanel()

    const heart = within(panel).getByRole('button', {
      name: 'Wishlist: Title ttl_mm',
    })
    expect(heart).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(useAuthDialogStore.getState().open).toBe(false))
    await u.click(heart)

    await waitFor(() =>
      expect(useAuthDialogStore.getState()).toMatchObject({
        open: true,
        view: 'login',
      }),
    )
    expect(bodies('POST /wishlist/items')).toHaveLength(0)
    useAuthDialogStore.setState({ open: false })
  })

  it('offers the title page when the preview cannot load', async () => {
    mockPreview(previewOf('ttl_mm'), {
      'GET /titles/ttl_mm/preview': apiError(503, 'unavailable'),
    })
    await renderWithProviders(<TitlePreviewPanel titleId="ttl_mm" />)

    expect(
      await screen.findByRole('link', { name: 'Open the title' }),
    ).toHaveAttribute('href', '/titles/ttl_mm')
  })
})

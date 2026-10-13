import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { TitlePage } from '../title-page'
import { renderWithProviders } from '@/test/render'
import { mockTitle, vaesen } from '@/test/title'

/** An IntersectionObserver the test drives: `report` plays an entry. */
class FakeObserver {
  static last: FakeObserver | undefined
  readonly root = null
  readonly rootMargin = ''
  readonly scrollMargin = ''
  readonly thresholds = []
  constructor(private callback: IntersectionObserverCallback) {
    FakeObserver.last = this
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
  report(entry: { isIntersecting: boolean; top: number }) {
    this.callback(
      [
        {
          isIntersecting: entry.isIntersecting,
          boundingClientRect: { top: entry.top } as DOMRectReadOnly,
          rootBounds: { top: 100 } as DOMRectReadOnly,
        } as IntersectionObserverEntry,
      ],
      this,
    )
  }
}

/** Where each section's top is on screen; jsdom has no layout. */
const tops: Record<string, number> = {}

beforeEach(() => {
  FakeObserver.last = undefined
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  for (const id of ['overview', 'details', 'reviews']) tops[id] = 2000
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: Element) {
      return { top: tops[this.id] ?? 0, bottom: 0 } as DOMRect
    },
  )
  // a long page, scrolled to the top
  vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(
    5000,
  )
})

async function renderTitle() {
  const result = await renderWithProviders(<TitlePage titleId="ttl_vaesen" />)
  await screen.findByRole('heading', { level: 1, name: vaesen.title })
  return result
}

const bar = () =>
  screen
    .getByRole('navigation', { name: 'Product sections' })
    .closest('[data-slot="product-bar"]') as HTMLElement

/** The page's <h1> leaves upwards, under the sticky row. */
const scrollPastTitle = () =>
  act(() => FakeObserver.last?.report({ isIntersecting: false, top: -40 }))

describe('ProductStickyNav', () => {
  it('shows the breadcrumb, linking to the publisher and the rule system', async () => {
    mockTitle()
    await renderTitle()

    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(
      within(crumbs).getByRole('link', { name: 'Free League Publishing' }),
    ).toHaveAttribute('href', '/titles?publisher=pub_free_league')
    expect(
      within(crumbs).getByRole('link', { name: 'Year Zero Engine' }),
    ).toHaveAttribute('href', '/titles?system=year_zero')
    expect(within(crumbs).getByText(vaesen.title)).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('keeps the bar closed and inert until the title has scrolled away', async () => {
    mockTitle()
    await renderTitle()

    expect(bar()).toHaveAttribute('inert')
    // still on screen: stays closed
    act(() => FakeObserver.last?.report({ isIntersecting: true, top: 200 }))
    expect(bar()).toHaveAttribute('inert')

    scrollPastTitle()
    expect(bar()).not.toHaveAttribute('inert')

    // back up: below the sticky line again
    act(() => FakeObserver.last?.report({ isIntersecting: true, top: 150 }))
    expect(bar()).toHaveAttribute('inert')
  })

  it('marks the section being read', async () => {
    mockTitle()
    await renderTitle()
    const tabs = within(
      screen.getByRole('navigation', { name: 'Product sections' }),
    )
    expect(tabs.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'true',
    )

    tops.overview = -500
    tops.details = 10
    fireEvent.scroll(window)
    await waitFor(() =>
      expect(tabs.getByRole('link', { name: 'Details' })).toHaveAttribute(
        'aria-current',
        'true',
      ),
    )
    expect(tabs.getByRole('link', { name: 'Overview' })).not.toHaveAttribute(
      'aria-current',
    )
    // the review count stays in the page's own tab, not the bar's
    expect(
      tabs.getByRole('link', { name: 'Reviews & Discussions' }),
    ).toBeInTheDocument()
  })

  it('scrolls to a section from its tab and puts it in the URL', async () => {
    mockTitle()
    const { user: u, router } = await renderTitle()
    scrollPastTitle()
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView')

    await u.click(
      within(
        screen.getByRole('navigation', { name: 'Product sections' }),
      ).getByRole('link', { name: 'Reviews & Discussions' }),
    )

    expect(scroll).toHaveBeenCalledOnce()
    expect(scroll.mock.contexts[0]).toBe(document.getElementById('reviews'))
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    await waitFor(() => expect(router.state.location.hash).toBe('reviews'))
  })

  it('prices the edition chosen in the buy box', async () => {
    mockTitle()
    const { user: u } = await renderTitle()
    scrollPastTitle()
    expect(within(bar()).getByText('$19.99')).toBeInTheDocument()

    await u.click(screen.getByRole('radio', { name: /^Hardcover/ }))

    expect(within(bar()).getByText('$44.99')).toBeInTheDocument()
    expect(within(bar()).queryByText('$19.99')).toBeNull()
  })

  it('adds the chosen edition once, then says so', async () => {
    const { bodies } = mockTitle({
      'POST /cart/items': { status: 201, body: {} },
    })
    const { user: u } = await renderTitle()
    scrollPastTitle()

    await u.click(within(bar()).getByRole('button', { name: 'Add to Cart' }))

    expect(
      await within(bar()).findByRole('button', { name: 'Added ✓' }),
    ).toBeInTheDocument()
    expect(bodies('POST /cart/items')).toEqual([{ sku: 'sku_pdf', qty: 1 }])
  })

  it('says why it cannot add, as the buy box does', async () => {
    mockTitle({
      'GET /titles/ttl_vaesen': { body: { ...vaesen, owned: true } },
    })
    await renderTitle()

    expect(
      within(bar()).getByRole('button', { name: 'In your library' }),
    ).toBeDisabled()
  })
})

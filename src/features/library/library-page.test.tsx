import { screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { libraryItem, search as makeSearch } from '@/test/library'
import { LibraryPage } from './library-page'
import type { LibrarySearch } from './library-search'
import { assetUrl } from '@/api/client'
import type { LibraryItem } from '@/api/library'
import { apiError, mockApi } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

/** Holds the search like the route does (there it lives in the URL). */
function Harness({ initial }: { initial: LibrarySearch }) {
  const [search, setSearch] = useState(initial)
  return (
    <>
      <LibraryPage
        search={search}
        onSearchChange={(patch) =>
          setSearch((previous) => ({ ...previous, ...patch }))
        }
      />
      <output data-testid="search">{JSON.stringify(search)}</output>
    </>
  )
}
const currentSearch = (): LibrarySearch =>
  JSON.parse(screen.getByTestId('search').textContent)

const library = [
  libraryItem('eberron', {
    name: 'Exploring Eberron',
    ruleSystem: 'd20_5e',
    type: 'setting',
    publisher: { id: 'pub_visionary', name: 'Visionary Production and Design' },
    hasUpdate: true,
    purchasedAt: '2026-08-14T09:00:00Z',
    files: [
      {
        id: 'fil_eberron',
        name: 'exploring_eberron.pdf',
        format: 'pdf',
        sizeMb: 88.1,
        isNew: true,
      },
    ],
  }),
  libraryItem('ashes', {
    name: 'Ashes of the Hollow King',
    purchasedAt: '2026-07-11T09:00:00Z',
    formats: ['pdf', 'vtt'],
    files: [
      {
        id: 'fil_ashes',
        name: 'ashes.pdf',
        format: 'pdf',
        sizeMb: 11,
        isNew: false,
      },
      {
        id: 'fil_ashes_vtt',
        name: 'ashes_maps.zip',
        format: 'vtt',
        sizeMb: 2.5,
        isNew: false,
      },
    ],
  }),
  libraryItem('salt', {
    name: 'Salt & Lanternlight',
    ruleSystem: 'system_neutral',
    publisher: { id: 'pub_onyx_path', name: 'Onyx Path Publishing' },
    giftFrom: { displayName: 'Jon Snow' },
    purchasedAt: '2026-06-12T09:00:00Z',
  }),
]

function mockLibrary(
  items: Array<LibraryItem> = library,
  overrides: Record<string, Handler> = {},
) {
  return mockApi({
    'GET /library': { body: { items } },
    'GET /library/files/fil_eberron/download': {
      body: { url: '/files/eberron.pdf' },
    },
    'POST /library/download-bundle': { body: { jobId: 'job_1' } },
    'GET /library/download-bundle/job_1': {
      body: { status: 'ready', url: '/files/bundle.zip' },
    },
    'POST /library/eberron/mark-updates-seen': { status: 204 },
    ...overrides,
  })
}

async function renderPage(initial: Partial<LibrarySearch> = {}) {
  const result = await renderWithProviders(
    <Harness initial={makeSearch(initial)} />,
  )
  await screen.findByRole('list', { name: 'My library' })
  return result
}

const cards = () =>
  within(screen.getByRole('list', { name: 'My library' }))
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent)
const sidebar = () => screen.getByRole('complementary', { name: 'Filters' })
const fakeTab = () => ({ opener: {}, location: { href: '' }, close: vi.fn() })

describe('LibraryPage', () => {
  it('lists the library, most recently added first', async () => {
    mockLibrary()
    await renderPage()

    expect(cards()).toEqual([
      'Exploring Eberron',
      'Ashes of the Hollow King',
      'Salt & Lanternlight',
    ])
    expect(screen.getByText('Showing 1–3 of 3')).toBeInTheDocument()
    expect(
      screen.getByText('Updated', { selector: '[data-slot=badge]' }),
    ).toBeVisible()
    expect(screen.getByText('Gift from Jon Snow')).toBeVisible()
    expect(
      screen.getByRole('button', { name: /^2 files, 13\.5 MB/ }),
    ).toBeVisible()
  })

  it('filters by facets, with live counts', async () => {
    mockLibrary()
    const { user } = await renderPage()

    await user.click(within(sidebar()).getByLabelText('OSR'))

    expect(currentSearch()).toMatchObject({ system: 'osr', page: 1 })
    expect(cards()).toEqual(['Ashes of the Hollow King'])
    // the status counts follow the facets
    const status = within(sidebar()).getByRole('radiogroup', { name: 'Status' })
    expect(within(status).getByText('Gifts').parentElement).toHaveTextContent(
      'Gifts0',
    )

    await user.click(within(sidebar()).getByLabelText('D20 / 5e'))
    expect(currentSearch().system).toBe('osr,d20_5e')
    expect(cards()).toEqual(['Exploring Eberron', 'Ashes of the Hollow King'])
  })

  it('filters by status, search and sort', async () => {
    mockLibrary()
    const { user } = await renderPage()

    await user.click(within(sidebar()).getByLabelText('Gifts'))
    expect(cards()).toEqual(['Salt & Lanternlight'])

    await user.click(within(sidebar()).getByLabelText('All'))
    await user.type(
      screen.getByRole('searchbox', { name: 'Search in library' }),
      'ash',
    )
    expect(cards()).toEqual(['Ashes of the Hollow King'])
  })

  it('opens from the URL with its filters applied', async () => {
    mockLibrary()
    await renderPage({ sort: 'title', format: 'pdf' })

    expect(cards()).toEqual([
      'Ashes of the Hollow King',
      'Exploring Eberron',
      'Salt & Lanternlight',
    ])
  })

  it('offers to clear filters when nothing matches', async () => {
    mockLibrary()
    const { user } = await renderWithProviders(
      <Harness initial={makeSearch({ status: 'gifts', system: 'osr' })} />,
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Nothing in your library matches these filters',
      }),
    ).toBeVisible()
    expect(
      screen.getByText('You own 3 titles. None of them match.'),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Bought it recently? Check Orders →' }),
    ).toHaveAttribute('href', '/orders')
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(cards()).toHaveLength(3)
  })

  it('pages twelve at a time', async () => {
    mockLibrary(
      Array.from({ length: 14 }, (_, index) =>
        libraryItem(`t${index}`, {
          purchasedAt: `2026-01-${String(28 - index).padStart(2, '0')}T00:00:00Z`,
        }),
      ),
    )
    const { user } = await renderPage()

    expect(cards()).toHaveLength(12)
    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    expect(cards()).toEqual(['Title t12', 'Title t13'])
    expect(screen.getByText('Showing 13–14 of 14')).toBeInTheDocument()
  })

  it('downloads a single file and clears the Updated badge', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    // like the API, remember the update was seen (the page refetches after)
    let seen = false
    const { bodies } = mockLibrary(library, {
      'GET /library': () => ({
        body: {
          items: library.map((item) => ({
            ...item,
            hasUpdate: item.hasUpdate && !seen,
          })),
        },
      }),
      'POST /library/eberron/mark-updates-seen': () => {
        seen = true
        return { status: 204 }
      },
    })
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Download Exploring Eberron' }),
    )

    await waitFor(() =>
      expect(tab.location.href).toBe(assetUrl('/files/eberron.pdf')),
    )
    await waitFor(() =>
      expect(bodies('POST /library/eberron/mark-updates-seen')).toHaveLength(1),
    )
    expect(
      screen.queryByText('Updated', { selector: '[data-slot=badge]' }),
    ).toBeNull()
  })

  it('zips a title with several files', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const { bodies } = mockLibrary()
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Download Ashes of the Hollow King' }),
    )

    await waitFor(() =>
      expect(tab.location.href).toBe(assetUrl('/files/bundle.zip')),
    )
    expect(bodies('POST /library/download-bundle')).toEqual([
      { itemIds: ['ashes'] },
    ])
  })

  it('lists a title’s files, each with its own download', async () => {
    mockLibrary()
    const { user } = await renderPage()

    const toggle = screen.getByRole('button', { name: /^2 files/ })
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByRole('button', { name: 'Download ashes_maps.zip' }),
    ).toBeVisible()
  })

  it('downloads the selected titles together', async () => {
    const tab = fakeTab()
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    const { bodies } = mockLibrary()
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('checkbox', { name: 'Select Exploring Eberron' }),
    )
    await user.click(
      screen.getByRole('checkbox', { name: 'Select Salt & Lanternlight' }),
    )
    expect(
      screen.getByRole('checkbox', { name: 'Select all' }),
    ).toHaveAttribute('data-state', 'indeterminate')

    await user.click(screen.getByRole('button', { name: 'Download 2 titles' }))

    await waitFor(() =>
      expect(tab.location.href).toBe(assetUrl('/files/bundle.zip')),
    )
    expect(bodies('POST /library/download-bundle')).toEqual([
      { itemIds: ['eberron', 'salt'] },
    ])
    // done: the selection is cleared
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /^Download 2 titles/ }),
      ).toBeNull(),
    )
  })

  it('says so when a download cannot be prepared', async () => {
    vi.spyOn(window, 'open').mockReturnValue(fakeTab() as unknown as Window)
    const error = vi.spyOn(toast, 'error')
    mockLibrary(library, {
      'GET /library/files/fil_eberron/download': apiError(503, 'unavailable'),
    })
    const { user } = await renderPage()

    await user.click(
      screen.getByRole('button', { name: 'Download Exploring Eberron' }),
    )

    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'We could not prepare the download. Try again.',
      ),
    )
  })

  it('opens the filters in a sheet on phones', async () => {
    mockLibrary()
    const { user } = await renderPage({ system: 'osr' })

    await user.click(screen.getByRole('button', { name: /^Filters/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Filters' })

    // groups other than Status start closed there, with what is picked
    expect(
      within(sheet).getByRole('button', { name: /^Rule System/ }),
    ).toHaveTextContent('1 selected')
    await user.click(within(sheet).getByRole('button', { name: 'Clear all' }))
    expect(currentSearch().system).toBe('')

    await user.click(
      within(sheet).getByRole('button', { name: 'Show 3 results' }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('says so when the library is empty', async () => {
    mockLibrary([])
    await renderWithProviders(<Harness initial={makeSearch()} />)

    expect(
      await screen.findByRole('heading', { name: 'Your library is empty' }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Browse the store' }),
    ).toHaveAttribute('href', '/titles')
    expect(
      screen.getByRole('link', { name: /Looking for free titles\?/ }),
    ).toHaveAttribute('href', '/titles?priceMax=0')
  })
})

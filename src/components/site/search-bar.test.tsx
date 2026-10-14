import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { highlight, SearchBar } from './search-bar'
import { useRecentSearches } from '@/stores/recent-searches'
import { mockApi } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

afterEach(() => useRecentSearches.setState({ queries: [] }))

const usd = (amount: number) => ({ amount, currency: 'USD' })

const suggestions = {
  queries: ['Vaesen', 'Vaesen horror'],
  titles: [
    {
      id: 'ttl_vaesen_cmn',
      title: 'Vaesen: City of My Nightmares',
      publisher: { id: 'pub_free_league', name: 'Free League Publishing' },
      cover: null,
      formats: ['print_pdf'],
      price: usd(4499),
      listPrice: usd(4499),
      aiGenerated: false,
    },
  ],
  publishers: [{ id: 'pub_vae', name: 'Vae Press', logo: null }],
}

function mockSearch(overrides: Record<string, Handler> = {}) {
  return mockApi({
    'GET /search/popular': { body: { terms: ['Coriolis', 'solo'] } },
    'GET /search/suggest': ({ params }) => ({
      body:
        params.get('q') === 'zzz'
          ? { titles: [], publishers: [], queries: [] }
          : suggestions,
    }),
    ...overrides,
  })
}

const field = () => screen.getByRole('combobox', { name: 'Search titles' })
const panel = () => screen.getByRole('listbox', { name: 'Search suggestions' })

describe('SearchBar', () => {
  it('opens on focus with recent and popular searches', async () => {
    useRecentSearches.setState({ queries: ['Free League'] })
    mockSearch()
    const { user, router } = await renderWithProviders(<SearchBar />)

    await user.click(field())
    expect(field()).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(panel()).getByRole('option', { name: /Free League/ }),
    ).toBeVisible()

    await user.click(await screen.findByRole('button', { name: 'Coriolis' }))
    await waitFor(() =>
      expect(router.state.location.href).toBe('/search?q=Coriolis'),
    )
    expect(useRecentSearches.getState().queries).toEqual([
      'Coriolis',
      'Free League',
    ])
  })

  it('suggests searches, titles and publishers while typing', async () => {
    mockSearch()
    const { user } = await renderWithProviders(<SearchBar />)

    await user.type(field(), 'vae')

    const title = await within(panel()).findByRole('option', {
      name: /City of My Nightmares/,
    })
    expect(title).toHaveTextContent('Free League Publishing · Print + PDF')
    // the typed words stand out
    expect(within(title).getByText('Vae', { selector: 'mark' })).toBeVisible()
    expect(
      within(panel()).getByRole('option', { name: /Vaesen horror/ }),
    ).toBeVisible()
    expect(
      within(panel()).getByRole('option', { name: /Vae Press/ }),
    ).toBeVisible()
    expect(
      screen.getByRole('option', { name: /See all results for “vae”/ }),
    ).toBeVisible()
  })

  it('moves with the arrow keys and opens the picked title', async () => {
    mockSearch()
    const { user, router } = await renderWithProviders(<SearchBar />)

    await user.type(field(), 'vae')
    await within(panel()).findByRole('option', { name: /City of My/ })

    // two suggested searches, then the title
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    const active = document.getElementById(
      field().getAttribute('aria-activedescendant') ?? '',
    )
    expect(active).toHaveTextContent('Vaesen: City of My Nightmares')
    await user.keyboard('{Enter}')

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/titles/ttl_vaesen_cmn'),
    )
    expect(field()).toHaveAttribute('aria-expanded', 'false')
  })

  it('searches the words with Enter, and remembers them', async () => {
    mockSearch()
    const { user, router } = await renderWithProviders(<SearchBar />)

    await user.type(field(), 'vaesen horror{Enter}')

    await waitFor(() => expect(router.state.location.pathname).toBe('/search'))
    expect(router.state.location.search).toEqual({ q: 'vaesen horror' })
    expect(useRecentSearches.getState().queries).toEqual(['vaesen horror'])
  })

  it('says when nothing matches quickly, and closes with Escape', async () => {
    mockSearch()
    const { user } = await renderWithProviders(<SearchBar />)

    await user.type(field(), 'zzz')
    expect(await screen.findByText('No quick matches for “zzz”')).toBeVisible()

    await user.keyboard('{Escape}')
    expect(field()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('forgets one recent search, or all of them', async () => {
    useRecentSearches.setState({ queries: ['Vaesen', 'Coriolis'] })
    mockSearch()
    const { user } = await renderWithProviders(<SearchBar />)

    await user.click(field())
    await user.click(
      screen.getByRole('button', {
        name: 'Remove Vaesen from recent searches',
      }),
    )
    expect(useRecentSearches.getState().queries).toEqual(['Coriolis'])

    await user.click(screen.getByRole('button', { name: 'Clear all' }))
    expect(useRecentSearches.getState().queries).toEqual([])
  })
})

describe('highlight', () => {
  it('leaves the text alone without a query', () => {
    expect(highlight('Vaesen', ' ')).toBe('Vaesen')
  })
})

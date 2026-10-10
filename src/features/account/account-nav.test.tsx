import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { AccountHubNav, AccountSidebarNav } from './account-nav'
import { ORDERS_SEARCH_DEFAULTS, useLastOrdersSearch } from './orders-search'
import { renderWithProviders } from '@/test/render'

afterEach(() => {
  useLastOrdersSearch.setState({ search: ORDERS_SEARCH_DEFAULTS })
})

const ordersHref = () => {
  const link = screen.getByRole('link', { name: /^Orders/ })
  return new URL(link.getAttribute('href') ?? '', 'http://x')
}

describe('account navigation', () => {
  it('"Orders" goes back to the list as the user left it', async () => {
    useLastOrdersSearch.setState({
      search: { ...ORDERS_SEARCH_DEFAULTS, period: 'all', status: 'paid' },
    })
    await renderWithProviders(<AccountSidebarNav />)

    expect(ordersHref().pathname).toBe('/orders')
    expect(ordersHref().searchParams.get('period')).toBe('all')
    expect(ordersHref().searchParams.get('status')).toBe('paid')
  })

  it('the mobile hub does the same', async () => {
    useLastOrdersSearch.setState({
      search: { ...ORDERS_SEARCH_DEFAULTS, page: 3 },
    })
    await renderWithProviders(<AccountHubNav />)

    expect(ordersHref().searchParams.get('page')).toBe('3')
  })

  it('other links carry no search', async () => {
    useLastOrdersSearch.setState({
      search: { ...ORDERS_SEARCH_DEFAULTS, period: 'all' },
    })
    await renderWithProviders(<AccountSidebarNav />)

    expect(screen.getByRole('link', { name: 'Following' })).toHaveAttribute(
      'href',
      '/following',
    )
  })
})

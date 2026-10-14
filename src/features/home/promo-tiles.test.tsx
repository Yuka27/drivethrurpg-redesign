import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { PromoTiles } from './promo-tiles'
import { mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const promo = (index: number) => ({
  id: `promo_${index}`,
  label: 'Seasonal sale',
  discountLabel: `${index}0% off`,
  title: `Campaign ${index}`,
  subtitle: 'Vaesen, Coriolis and more',
  art: { url: `/img/promos/${index}.jpg`, alt: '' },
  link: `/titles?onSale=true&promo=${index}`,
  endsAt: null,
})

async function renderPromos(count: number) {
  mockApi({
    'GET /home': {
      body: {
        hero: [],
        promos: Array.from({ length: count }, (_, index) => promo(index + 1)),
        sections: [],
        publishers: [],
      },
    },
  })
  await renderWithProviders(<PromoTiles />)
  return screen.findByRole('region', { name: 'Discounts & Promos' })
}

/** For each tile, in order: whether it spans both desktop rows. */
const tallTiles = (region: HTMLElement) =>
  within(region)
    .getAllByRole('listitem')
    .map((tile) => tile.classList.contains('lg:row-span-2'))

describe('PromoTiles', () => {
  it('makes the last of three tall', async () => {
    const region = await renderPromos(3)

    expect(tallTiles(region)).toEqual([true, true, true])
    expect(within(region).queryByRole('button', { name: /promos/ })).toBeNull()
  })

  it('stacks the third and fourth in the last column', async () => {
    const region = await renderPromos(4)

    expect(tallTiles(region)).toEqual([true, true, false, false])
    // one page: no pager
    expect(within(region).queryByRole('button', { name: /promos/ })).toBeNull()
  })

  it('pages more than four, each page in the same layout', async () => {
    const region = await renderPromos(6)

    const pages = within(region).getAllByRole('list')
    expect(pages.map((page) => page.getAttribute('aria-label'))).toEqual([
      'Promos, page 1 of 2',
      'Promos, page 2 of 2',
    ])
    expect(tallTiles(pages[0])).toEqual([true, true, false, false])
    expect(tallTiles(pages[1])).toEqual([true, true])
    expect(
      within(region).getByRole('button', { name: 'Previous promos' }),
    ).toBeDisabled()
    expect(
      within(region).getByRole('button', { name: 'Next promos' }),
    ).toBeEnabled()
  })

  it('links each campaign to its own address', async () => {
    const region = await renderPromos(5)

    expect(
      within(region).getByRole('link', { name: /Campaign 5/ }),
    ).toHaveAttribute('href', '/titles?onSale=true&promo=5')
  })
})

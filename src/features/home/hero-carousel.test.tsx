import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

import { HeroCarousel } from './hero-carousel'
import { mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const slide = (
  id: string,
  title: string,
  contentSide: 'left' | 'right',
  alt = '',
) => ({
  id,
  title,
  subtitle: `About ${title}`,
  cta: `Open ${title}`,
  link: `/titles?promo=${id}`,
  image: { url: `/img/hero/${id}.jpg`, alt },
  contentSide,
  autoplayMs: null,
})

function mockHero(
  heroOptions: unknown = {
    autoplay: false,
    intervalMs: 6000,
    pauseOnHover: true,
    contentSide: ['left', 'right'],
  },
) {
  return mockApi({
    'GET /home': {
      body: {
        hero: [
          slide('bn_1', 'Autumn of Horror sale', 'right'),
          slide('bn_2', 'Dragonbane Book of Magic', 'left', 'A dragon'),
        ],
        heroOptions,
        promos: [],
        publishers: [],
        sections: [],
      },
    },
  })
}

async function renderHero() {
  const result = await renderWithProviders(<HeroCarousel />)
  await screen.findByRole('region', { name: 'Featured' })
  return result
}

const slides = () => screen.getAllByRole('group', { name: /^\d of 2$/ })
/** "1 of 2": the slide that is not inert */
const activeSlide = () =>
  slides()
    .find((group) => !group.hasAttribute('inert'))
    ?.getAttribute('aria-label')
const dot = (name: RegExp) =>
  within(screen.getByRole('group', { name: 'Slides' })).getByRole('button', {
    name,
  })

function reduceMotion() {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query) =>
      ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) satisfies MediaQueryList,
  )
}

describe('HeroCarousel', () => {
  it('is a carousel region of "n of N" slides', async () => {
    mockHero()
    await renderHero()

    const region = screen.getByRole('region', { name: 'Featured' })
    expect(region).toHaveAttribute('aria-roledescription', 'carousel')
    expect(slides().map((group) => group.getAttribute('aria-label'))).toEqual([
      '1 of 2',
      '2 of 2',
    ])
    for (const group of slides())
      expect(group).toHaveAttribute('aria-roledescription', 'slide')
    // the CTA is a real link to the slide's address
    expect(
      within(slides()[0]).getByRole('link', {
        name: 'Open Autumn of Horror sale',
      }),
    ).toHaveAttribute('href', '/titles?promo=bn_1')
  })

  it('keeps the API alt, falling back to the title, on a 3:1 image', async () => {
    mockHero()
    await renderHero()

    const [first, second] = slides()
    const image = within(first).getByRole('img', {
      name: 'Autumn of Horror sale',
    })
    expect(image).toHaveClass('object-cover')
    expect(image.parentElement).toHaveClass('aspect-[3/1]')
    expect(image).toHaveAttribute(
      'src',
      expect.stringMatching(/\/img\/hero\/bn_1\.jpg$/),
    )
    expect(
      within(second).getByRole('img', { name: 'A dragon', hidden: true }),
    ).toBeInTheDocument()
  })

  it.each([
    ['right', 0, 'lg:text-right', 'bg-linear-to-l'],
    ['left', 1, 'lg:text-left', 'bg-linear-to-r'],
  ] as const)(
    'puts the copy and the gradient on the %s',
    async (side, index, textClass, gradientClass) => {
      mockHero()
      await renderHero()

      const root = slides()[index].querySelector('[data-content-side]')
      expect(root).toHaveAttribute('data-content-side', side)
      const heading = within(slides()[index]).getByRole('heading', {
        level: 2,
        hidden: true,
      })
      expect(heading.closest('.dark')).toHaveClass(textClass, `lg:${side}-0`)
      expect(root?.querySelector(`.${gradientClass}`)).not.toBeNull()
    },
  )

  it('moves with the arrows and the dots, the current dot marked', async () => {
    mockHero()
    const { user } = await renderHero()
    expect(activeSlide()).toBe('1 of 2')
    expect(dot(/^Slide 1/)).toHaveAttribute('aria-current', 'true')
    expect(dot(/^Slide 2/)).not.toHaveAttribute('aria-current')

    await user.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(activeSlide()).toBe('2 of 2')
    expect(dot(/^Slide 2/)).toHaveAttribute('aria-current', 'true')

    // round the end
    await user.click(screen.getByRole('button', { name: 'Next slide' }))
    expect(activeSlide()).toBe('1 of 2')
    await user.click(screen.getByRole('button', { name: 'Previous slide' }))
    expect(activeSlide()).toBe('2 of 2')

    await user.click(dot(/^Slide 1: Autumn of Horror sale$/))
    expect(activeSlide()).toBe('1 of 2')
  })

  it('moves with ← and → while it has focus', async () => {
    mockHero()
    const { user } = await renderHero()

    act(() => screen.getByRole('region', { name: 'Featured' }).focus())
    await user.keyboard('{ArrowRight}')
    expect(activeSlide()).toBe('2 of 2')
    await user.keyboard('{ArrowLeft}')
    expect(activeSlide()).toBe('1 of 2')
  })

  it('plays at the API interval, and the pause button stops it', async () => {
    mockHero({
      autoplay: true,
      intervalMs: 80,
      pauseOnHover: true,
      contentSide: [],
    })
    const { user } = await renderHero()

    await waitFor(() => expect(activeSlide()).toBe('2 of 2'))
    await user.click(screen.getByRole('button', { name: 'Pause the slides' }))
    const stopped = activeSlide()
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(activeSlide()).toBe(stopped)
    expect(
      screen.getByRole('button', { name: 'Play the slides' }),
    ).toBeVisible()
  })

  it('stops while the pointer is over it', async () => {
    mockHero({
      autoplay: true,
      intervalMs: 80,
      pauseOnHover: true,
      contentSide: [],
    })
    const { user } = await renderHero()

    await user.hover(screen.getByRole('region', { name: 'Featured' }))
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(activeSlide()).toBe('1 of 2')
  })

  it('stops while focus is inside, but plays from its own Play button', async () => {
    mockHero({
      autoplay: true,
      intervalMs: 80,
      pauseOnHover: false,
      contentSide: [],
    })
    const { user } = await renderHero()

    act(() => screen.getByRole('region', { name: 'Featured' }).focus())
    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(activeSlide()).toBe('1 of 2')

    // pause, then play: focus is on the button, and it plays all the same
    await user.click(screen.getByRole('button', { name: 'Pause the slides' }))
    await user.click(screen.getByRole('button', { name: 'Play the slides' }))
    await waitFor(() => expect(activeSlide()).toBe('2 of 2'))
  })

  it('does not play at all with reduced motion', async () => {
    reduceMotion()
    mockHero({
      autoplay: true,
      intervalMs: 50,
      pauseOnHover: true,
      contentSide: [],
    })
    await renderHero()

    await new Promise((resolve) => setTimeout(resolve, 250))
    expect(activeSlide()).toBe('1 of 2')
    expect(screen.queryByRole('button', { name: /the slides/ })).toBeNull()
  })

  it('stays still when the API sends no options', async () => {
    mockHero(null)
    await renderHero()

    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(activeSlide()).toBe('1 of 2')
    expect(screen.queryByRole('button', { name: /the slides/ })).toBeNull()
  })
})

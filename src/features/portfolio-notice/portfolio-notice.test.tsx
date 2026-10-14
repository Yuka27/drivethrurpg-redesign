import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { AboutProjectLink } from './about-project-link'
import {
  NOTICE_KEY,
  NOTICE_SESSION_KEY,
  NOTICE_VERSION,
} from './notice-storage'
import { PortfolioNotice } from './portfolio-notice'
import { usePortfolioNotice } from './use-portfolio-notice'
import { projectLinks } from '@/config/project-links'
import { renderWithProviders } from '@/test/render'

const TITLE = 'You are looking at a design case study, not a shop.'

/** A new page load: the store forgets, storage stays. */
const reload = () =>
  usePortfolioNotice.setState({
    open: false,
    forever: false,
    handled: false,
    returnFocusTo: null,
  })

beforeEach(reload)
afterEach(() => vi.restoreAllMocks())

async function renderNotice() {
  const result = await renderWithProviders(
    <>
      <PortfolioNotice autoOpen />
      <footer>
        <AboutProjectLink />
      </footer>
    </>,
  )
  return result
}

const dialog = () => screen.queryByRole('dialog')
const findDialog = () => screen.findByRole('dialog', { name: TITLE })

describe('PortfolioNotice', () => {
  it('shows on the first visit, focused on "Enter the prototype"', async () => {
    await renderNotice()

    const notice = await findDialog()
    expect(notice).toHaveAccessibleDescription(
      expect.stringMatching(/^This is a UX\/UI redesign/),
    )
    expect(
      within(notice).getByRole('heading', { level: 1, name: TITLE }),
    ).toBeInTheDocument()
    expect(
      within(notice).getByRole('button', { name: 'Enter the prototype' }),
    ).toHaveFocus()
  })

  it('stays away once "Don’t show this again" was chosen', async () => {
    localStorage.setItem(
      NOTICE_KEY,
      JSON.stringify({ version: NOTICE_VERSION, hidden: true }),
    )
    await renderNotice()

    await screen.findByRole('button', { name: 'About this project' })
    expect(dialog()).toBeNull()
  })

  it('shows again when the stored choice is for an older version', async () => {
    localStorage.setItem(
      NOTICE_KEY,
      JSON.stringify({ version: NOTICE_VERSION - 1, hidden: true }),
    )
    await renderNotice()

    expect(await findDialog()).toBeVisible()
  })

  it('remembers "Don’t show this again" through any dismissal', async () => {
    const { user } = await renderNotice()
    const notice = await findDialog()

    await user.click(
      within(notice).getByRole('checkbox', { name: 'Don’t show this again' }),
    )
    await user.click(
      within(notice).getByRole('button', { name: 'Close notice' }),
    )

    await waitFor(() => expect(dialog()).toBeNull())
    expect(JSON.parse(localStorage.getItem(NOTICE_KEY) ?? '')).toEqual({
      version: NOTICE_VERSION,
      hidden: true,
    })
    // a new session does not bring it back
    sessionStorage.clear()
    reload()
    await renderNotice()
    await screen.findAllByRole('button', { name: 'About this project' })
    expect(dialog()).toBeNull()
  })

  it('without the checkbox, stays away this session and returns in the next', async () => {
    const { user, unmount } = await renderNotice()

    await user.click(
      within(await findDialog()).getByRole('button', {
        name: 'Enter the prototype',
      }),
    )
    await waitFor(() => expect(dialog()).toBeNull())
    expect(localStorage.getItem(NOTICE_KEY)).toBeNull()
    expect(sessionStorage.getItem(NOTICE_SESSION_KEY)).toBe(
      String(NOTICE_VERSION),
    )

    // another page load, same session
    unmount()
    reload()
    const second = await renderNotice()
    await screen.findByRole('button', { name: 'About this project' })
    expect(dialog()).toBeNull()

    // a new session
    sessionStorage.clear()
    second.unmount()
    reload()
    await renderNotice()
    expect(await findDialog()).toBeVisible()
  })

  it('closes with Esc', async () => {
    const { user } = await renderNotice()
    await findDialog()

    await user.keyboard('{Escape}')

    await waitFor(() => expect(dialog()).toBeNull())
    expect(sessionStorage.getItem(NOTICE_SESSION_KEY)).not.toBeNull()
  })

  it('closes with a click on the backdrop', async () => {
    const { user } = await renderNotice()
    await findDialog()

    const overlay = document.querySelector<HTMLElement>('.glass-overlay')
    expect(overlay).not.toBeNull()
    await user.click(overlay as HTMLElement)

    await waitFor(() => expect(dialog()).toBeNull())
  })

  it('opens again from the footer, even after "Don’t show this again", and gives focus back', async () => {
    localStorage.setItem(
      NOTICE_KEY,
      JSON.stringify({ version: NOTICE_VERSION, hidden: true }),
    )
    const { user } = await renderNotice()
    const about = await screen.findByRole('button', {
      name: 'About this project',
    })

    await user.click(about)
    const notice = await findDialog()
    // the stored choice shows
    expect(
      within(notice).getByRole('checkbox', { name: 'Don’t show this again' }),
    ).toBeChecked()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(dialog()).toBeNull())
    expect(about).toHaveFocus()
  })

  it('links each part of the project in a new tab, leaving out the ones without a URL', async () => {
    const figma = projectLinks.figma
    const coverage = projectLinks.coverage
    projectLinks.figma = 'https://www.figma.com/design/abc/case-study'
    projectLinks.coverage = ''
    try {
      await renderNotice()
      const notice = await findDialog()

      const links = within(
        within(notice).getByRole('region', { name: 'Explore the project' }),
      ).getAllByRole('link')
      expect(links.map((link) => link.textContent)).toEqual([
        expect.stringContaining('Figma case study'),
        expect.stringContaining('GitHub'),
        expect.stringContaining('Mock API docs'),
      ])
      for (const link of links) {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link.getAttribute('rel')).toContain('noopener')
      }
      expect(links[0]).toHaveAttribute(
        'href',
        'https://www.figma.com/design/abc/case-study',
      )
      // the API docs default: the API's origin + /docs
      expect(links[2].getAttribute('href')).toMatch(/^https?:\/\/[^/]+\/docs$/)
      expect(within(notice).queryByText('Test coverage')).toBeNull()
    } finally {
      projectLinks.figma = figma
      projectLinks.coverage = coverage
    }
  })

  it('still works when storage throws, showing once per page load', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const { user } = await renderNotice()

    await user.click(
      within(await findDialog()).getByRole('button', {
        name: 'Enter the prototype',
      }),
    )
    await waitFor(() => expect(dialog()).toBeNull())

    // the same page load does not show it again on its own
    usePortfolioNotice.getState().showIfFirstVisit()
    expect(usePortfolioNotice.getState().open).toBe(false)
  })

  it('does not open on its own when told not to', async () => {
    await renderWithProviders(<PortfolioNotice autoOpen={false} />)

    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(dialog()).toBeNull()
  })
})

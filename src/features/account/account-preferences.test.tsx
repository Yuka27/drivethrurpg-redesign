import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { AccountPreferencesPage } from './account-preferences'
import { usePreferencesStore } from '@/stores/preferences'
import { useThemeStore } from '@/stores/theme'
import { apiError, mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'

/** What the API returns today: no pauseMarketing, dailyDeals, reviewReminders, notifications or saveTo yet. */
const saved = {
  email: {
    orderReceipts: true,
    libraryFileUpdates: true,
    wishlistPriceDrops: false,
    newsletter: false,
    publisherContact: true,
    perPublisher: [],
  },
  downloads: { zipMultiFile: true, keepOriginalNames: false },
  content: {
    showAdult: false,
    showAiGenerated: false,
    language: 'en',
    currency: 'USD',
  },
  display: { theme: 'dark' },
}

const locales = {
  currencies: [
    { code: 'USD', symbol: '$', label: 'US dollar' },
    { code: 'EUR', symbol: '€', label: 'Euro' },
  ],
  languages: [
    { code: 'en', short: 'ENG', label: 'English' },
    { code: 'pl', short: 'POL', label: 'Polski' },
  ],
  defaults: {
    currency: 'USD',
    language: 'en',
    showAiGenerated: false,
    theme: 'dark',
  },
}

function mockPreferencesApi(overrides: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'GET /account/preferences': { body: saved },
    'GET /meta/locales': { body: locales },
    'PATCH /account/preferences': ({ body }) => ({
      body: { ...saved, ...(body as object) },
    }),
    ...overrides,
  })
}

const toggle = (name: string) => screen.getByRole('switch', { name })

async function renderPage() {
  const result = await renderWithProviders(<AccountPreferencesPage />)
  await screen.findByRole('switch', { name: 'Pause all marketing emails' })
  return result
}

describe('AccountPreferencesPage', () => {
  it('shows the saved settings, with defaults for ones the API does not return yet', async () => {
    mockPreferencesApi()
    await renderPage()

    expect(toggle('Pause all marketing emails')).not.toBeChecked()
    expect(toggle('Daily deal emails')).toBeChecked() // default
    expect(toggle('Review reminders')).toBeChecked() // default
    expect(toggle('Wishlist price drops')).not.toBeChecked() // saved
    expect(toggle('Library file updates')).toBeChecked()
    expect(toggle('Show publisher updates in Notifications')).not.toBeChecked()
    expect(
      toggle('Share my email with publishers for their own marketing'),
    ).toBeChecked()
    expect(toggle('Show adult content')).not.toBeChecked()

    // the hint describes its switch
    expect(toggle('Daily deal emails')).toHaveAccessibleDescription(
      'The Deal of the Day, once a day',
    )
    expect(
      screen.getByRole('combobox', { name: 'Save files to' }),
    ).toHaveTextContent('This device')
  })

  it('saves a change at once, sending only that setting', async () => {
    const { bodies } = mockPreferencesApi()
    const { user } = await renderPage()

    await user.click(toggle('Daily deal emails'))

    expect(toggle('Daily deal emails')).not.toBeChecked()
    await waitFor(() =>
      expect(bodies('PATCH /account/preferences')).toEqual([
        { email: { dailyDeals: false } },
      ]),
    )
  })

  it('puts the switch back and says so when saving fails', async () => {
    const error = vi.spyOn(toast, 'error')
    mockPreferencesApi({
      'PATCH /account/preferences': apiError(503, 'unavailable'),
    })
    const { user } = await renderPage()

    await user.click(toggle('Show adult content'))

    await waitFor(() => expect(toggle('Show adult content')).not.toBeChecked())
    expect(error).toHaveBeenCalledWith(
      'Could not save your preferences to your account.',
    )
  })

  it('pausing marketing turns off the marketing switches, but not file updates', async () => {
    mockPreferencesApi()
    const { user } = await renderPage()

    await user.click(toggle('Pause all marketing emails'))

    for (const name of [
      'Daily deal emails',
      'Review reminders',
      'Wishlist price drops',
    ]) {
      expect(toggle(name)).toBeDisabled()
      expect(toggle(name)).toHaveAccessibleDescription(
        'Paused with all marketing emails',
      )
    }
    expect(toggle('Library file updates')).toBeEnabled()
  })

  it('saves where downloads go', async () => {
    const { bodies } = mockPreferencesApi()
    const { user } = await renderPage()

    await user.click(screen.getByRole('combobox', { name: 'Save files to' }))
    await user.click(
      await screen.findByRole('option', { name: 'Ask every time' }),
    )

    await waitFor(() =>
      expect(bodies('PATCH /account/preferences')).toEqual([
        { downloads: { saveTo: 'ask' } },
      ]),
    )
    expect(
      screen.getByRole('combobox', { name: 'Save files to' }),
    ).toHaveTextContent('Ask every time')
  })

  it('currency and AI content are the app-wide settings', async () => {
    mockPreferencesApi()
    const { user } = await renderPage()

    const currency = await screen.findByRole('combobox', { name: 'Currency' })
    expect(currency).toHaveTextContent('$ USD')
    await user.click(currency)
    await user.click(await screen.findByRole('option', { name: /^EUR/ }))
    expect(usePreferencesStore.getState().currency).toBe('EUR')
    expect(currency).toHaveTextContent('€ EUR')

    await user.click(toggle('Show AI-generated content'))
    expect(usePreferencesStore.getState().aiContent).toBe(true)

    usePreferencesStore.setState({ currency: 'USD', aiContent: false })
  })

  it('switches the theme like the mobile menu', async () => {
    mockPreferencesApi()
    const { user } = await renderPage()
    useThemeStore.getState().setTheme('dark')

    const theme = screen.getByRole('radiogroup', { name: 'Theme' })
    await user.click(within(theme).getByRole('radio', { name: 'Light' }))

    expect(useThemeStore.getState().resolvedTheme).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
    expect(within(theme).getByRole('radio', { name: 'Light' })).toBeChecked()

    useThemeStore.getState().setTheme('dark')
  })

  it('manages publisher updates on the Following page', async () => {
    mockPreferencesApi()
    await renderPage()

    expect(
      screen.getByRole('link', {
        name: 'Manage updates from publishers you follow',
      }),
    ).toHaveAttribute('href', '/following')
  })

  it('shows the mobile breadcrumb back to the hub', async () => {
    mockPreferencesApi()
    await renderWithProviders(<AccountPreferencesPage breadcrumb />)

    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByText('Preferences')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })
})

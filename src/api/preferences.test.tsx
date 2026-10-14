import { act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { usePreferencesSync } from './preferences'
import { useThemeStore } from '@/stores/theme'
import { apiError, locales, mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const preferences = (theme?: string) => ({
  content: {
    showAdult: false,
    showAiGenerated: false,
    language: 'en',
    currency: 'USD',
  },
  ...(theme && { display: { theme } }),
})

function Sync() {
  usePreferencesSync()
  return null
}

/** A logged-in user (or a guest: /me 401) whose account has `theme` saved, if any. */
function mockSyncApi({
  loggedIn = true,
  theme,
  patch = { body: preferences() },
}: {
  loggedIn?: boolean
  theme?: string
  patch?: Handler
} = {}) {
  return mockApi({
    'GET /me': loggedIn ? { body: user } : apiError(401, 'unauthorized'),
    'GET /meta/locales': { body: locales },
    'GET /account/preferences': { body: preferences(theme) },
    'PATCH /account/preferences': patch,
  })
}

const setTheme = (theme: 'light' | 'dark') =>
  act(() => useThemeStore.getState().setTheme(theme))

afterEach(() => {
  useThemeStore.getState().setTheme('dark')
})

describe('theme sync', () => {
  it("applies the account's theme on this device after login", async () => {
    useThemeStore.getState().setTheme('dark')
    const { bodies } = mockSyncApi({ theme: 'light' })
    await renderWithProviders(<Sync />)

    await waitFor(() => expect(useThemeStore.getState().theme).toBe('light'))
    // stored on the device too, so the next visit opens in it without a flash
    expect(localStorage.getItem('dtrpg-theme')).toBe('light')
    // and not sent straight back
    expect(bodies('PATCH /account/preferences')).toHaveLength(0)
  })

  it('saves a logged-in user’s change to the account', async () => {
    const { bodies } = mockSyncApi({ theme: 'dark' })
    await renderWithProviders(<Sync />)
    await waitFor(() =>
      expect(bodies('GET /account/preferences')).toHaveLength(1),
    )

    setTheme('light')

    await waitFor(() =>
      expect(bodies('PATCH /account/preferences')).toEqual([
        { display: { theme: 'light' } },
      ]),
    )
  })

  it('keeps a guest’s theme on this device only', async () => {
    const { bodies } = mockSyncApi({ loggedIn: false })
    await renderWithProviders(<Sync />)
    await waitFor(() => expect(bodies('GET /me')).toHaveLength(1))

    setTheme('light')

    expect(localStorage.getItem('dtrpg-theme')).toBe('light')
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(bodies('PATCH /account/preferences')).toHaveLength(0)
    expect(bodies('GET /account/preferences')).toHaveLength(0)
  })

  it('a failed save keeps the theme the user picked and says so', async () => {
    const error = vi.spyOn(toast, 'error')
    const { bodies } = mockSyncApi({
      theme: 'dark',
      // like a real request: the screen renders the optimistic "light" before
      // the failure puts the cache back to "dark"
      patch: () =>
        new Promise((resolve) =>
          setTimeout(() => resolve(apiError(503, 'unavailable')), 30),
        ),
    })
    await renderWithProviders(<Sync />)
    await waitFor(() =>
      expect(bodies('GET /account/preferences')).toHaveLength(1),
    )

    setTheme('light')

    await waitFor(() => expect(error).toHaveBeenCalled())
    // the cache went back to "dark", but that must not switch the screen back
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(useThemeStore.getState().theme).toBe('light')
  })

  it('does not touch the device theme when the account has none yet', async () => {
    useThemeStore.getState().setTheme('light')
    const { bodies } = mockSyncApi()
    await renderWithProviders(<Sync />)

    await waitFor(() =>
      expect(bodies('GET /account/preferences')).toHaveLength(1),
    )
    expect(useThemeStore.getState().theme).toBe('light')
  })
})

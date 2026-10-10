import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { AuthDialog } from './auth-dialog'
import { TestingLinks } from '@/components/site/testing-links'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { mockApi, session } from '@/test/api'
import { renderWithProviders } from '@/test/render'

// switch views instantly instead of running the timed fade/resize sequence
beforeEach(() => {
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
})

afterEach(() => {
  useAuthDialogStore.setState({
    open: false,
    view: 'login',
    email: '',
    redirectTo: null,
  })
})

const dialog = () => screen.getByRole('dialog')
const heading = (name: string) =>
  within(dialog()).findByRole('heading', { name })

async function renderFooterAndDialog() {
  return renderWithProviders(
    <>
      <TestingLinks />
      <AuthDialog />
    </>,
  )
}

describe('password reset in the auth modal', () => {
  it('"Set new password" opens the reset view, and "Log in" follows it', async () => {
    mockApi({ 'POST /auth/reset-password': { status: 204 } })
    const { user } = await renderFooterAndDialog()

    await user.click(screen.getByRole('button', { name: 'Set new password' }))
    expect(dialog()).toHaveAccessibleName('Set a new password')

    await user.type(
      within(dialog()).getByLabelText('New password'),
      'a long new passphrase',
    )
    await user.click(
      within(dialog()).getByRole('button', { name: 'Update password' }),
    )
    await heading('Password updated')

    await user.click(within(dialog()).getByRole('button', { name: 'Log in' }))
    await heading('Welcome back')
  })

  it('an expired link leads to a new one, and the email travels between views', async () => {
    mockApi()
    const { user } = await renderFooterAndDialog()

    await user.click(
      screen.getByRole('button', { name: 'Set new password (expired link)' }),
    )
    await heading('This link has expired')

    await user.click(
      within(dialog()).getByRole('button', { name: 'Send me a new link' }),
    )
    await heading('Forgot your password?')

    await user.click(
      within(dialog()).getByRole('button', { name: 'Back to log in' }),
    )
    await heading('Welcome back')

    await user.type(
      within(dialog()).getByRole('textbox', { name: 'Email' }),
      'arya@example.com',
    )
    await user.click(
      within(dialog()).getByRole('button', { name: 'Forgot password?' }),
    )
    await heading('Forgot your password?')
    expect(
      within(dialog()).getByRole('textbox', { name: 'Email' }),
    ).toHaveValue('arya@example.com')
  })

  it('focus returns to the footer link when the modal closes', async () => {
    mockApi()
    const { user } = await renderFooterAndDialog()
    const link = screen.getByRole('button', { name: 'Set new password' })

    await user.click(link)
    await heading('Set a new password')
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(link).toHaveFocus()
  })
})

describe('signing in from the auth modal', () => {
  async function logIn(
    user: Awaited<ReturnType<typeof renderWithProviders>>['user'],
  ) {
    await user.type(
      within(dialog()).getByRole('textbox', { name: 'Email' }),
      'arya@example.com',
    )
    await user.type(
      within(dialog()).getByLabelText('Password'),
      'correct-password',
    )
    await user.click(within(dialog()).getByRole('button', { name: 'Log in' }))
  }

  it('continues to the protected page that asked for login', async () => {
    mockApi({ 'POST /auth/login': { body: session } })
    const { user, router } = await renderWithProviders(<AuthDialog />)

    // what the _auth guard does for a guest on /library
    act(() =>
      useAuthDialogStore
        .getState()
        .openAuth('login', { redirectTo: '/library?tab=pdf' }),
    )
    await heading('Welcome back')
    await logIn(user)

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(router.history.location.pathname).toBe('/library')
    expect(router.history.location.search).toBe('?tab=pdf')
  })

  it('stays on the current page when nothing asked for login', async () => {
    mockApi({ 'POST /auth/login': { body: session } })
    const { user, router } = await renderWithProviders(<AuthDialog />)

    act(() => useAuthDialogStore.getState().openAuth('login'))
    await heading('Welcome back')
    await logIn(user)

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(router.history.location.pathname).toBe('/')
  })
})

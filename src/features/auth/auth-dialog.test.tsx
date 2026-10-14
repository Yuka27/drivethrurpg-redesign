import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { AuthDialog } from './auth-dialog'
import { TestingLinks } from '@/components/site/testing-links'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { cart, mockApi, session } from '@/test/api'
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

describe('switching between login and sign-up', () => {
  it('goes to sign-up and back, focusing the first field each time', async () => {
    mockApi()
    const { user } = await renderWithProviders(<AuthDialog />)

    act(() => useAuthDialogStore.getState().openAuth('login'))
    await heading('Welcome back')
    await user.click(
      within(dialog()).getByRole('button', { name: 'Register here' }),
    )

    expect(await heading('Create your account')).toBeVisible()
    await waitFor(() =>
      expect(
        within(dialog()).getByRole('textbox', { name: 'Email' }),
      ).toHaveFocus(),
    )

    await user.click(within(dialog()).getByRole('button', { name: 'Log in' }))
    expect(await heading('Welcome back')).toBeVisible()
  })

  it('fades the old view out before the new one comes in', async () => {
    // full motion: the timed fade → resize → swap → fade-in sequence
    vi.mocked(window.matchMedia).mockImplementation(
      (query) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
        }) satisfies MediaQueryList,
    )
    mockApi()
    const { user } = await renderWithProviders(<AuthDialog />)

    act(() => useAuthDialogStore.getState().openAuth('login'))
    await heading('Welcome back')
    await user.click(
      within(dialog()).getByRole('button', { name: 'Register here' }),
    )

    // still the old view, marked busy, while it fades and the modal resizes
    const busy = dialog().querySelector('[aria-busy="true"]')
    expect(busy).not.toBeNull()
    expect(within(dialog()).getByText('Welcome back')).toBeInTheDocument()

    expect(
      await within(dialog()).findByRole(
        'heading',
        { name: 'Create your account' },
        { timeout: 3000 },
      ),
    ).toBeVisible()
    await waitFor(
      () => expect(dialog().querySelector('[aria-busy="true"]')).toBeNull(),
      { timeout: 3000 },
    )
    expect(
      within(dialog()).getByRole('textbox', { name: 'Email' }),
    ).toHaveFocus()
  })
})

describe('creating an account in the modal', () => {
  async function signUp(
    user: Awaited<ReturnType<typeof renderWithProviders>>['user'],
  ) {
    act(() => useAuthDialogStore.getState().openAuth('register'))
    await heading('Create your account')
    await user.type(
      within(dialog()).getByRole('textbox', { name: 'Email' }),
      'new@example.com',
    )
    await user.type(
      within(dialog()).getByLabelText('Password'),
      'a long passphrase',
    )
    await user.click(
      within(dialog()).getByRole('button', { name: 'Create account' }),
    )
  }

  it('welcomes the new account and brings the guest cart into it', async () => {
    const { bodies } = mockApi({
      'GET /cart': { body: cart(2) },
      'POST /auth/register': { status: 201, body: session },
      'POST /account/merge': { body: { merged: { cart: 2 } } },
    })
    const { user } = await renderWithProviders(<AuthDialog />)

    await signUp(user)

    expect(await heading('Welcome to DriveThruRPG')).toBeVisible()
    expect(
      await within(dialog()).findByText(
        '2 items from your cart were saved to your account.',
      ),
    ).toBeVisible()
    expect(
      within(dialog()).getByRole('button', { name: 'Continue to your cart' }),
    ).toBeVisible()
    expect(bodies('POST /account/merge')).toHaveLength(1)
  })

  it('merges nothing for an empty cart', async () => {
    const { bodies } = mockApi({
      'POST /auth/register': { status: 201, body: session },
    })
    const { user } = await renderWithProviders(<AuthDialog />)

    await signUp(user)

    expect(await heading('Welcome to DriveThruRPG')).toBeVisible()
    expect(
      within(dialog()).getByRole('button', { name: 'Continue shopping' }),
    ).toBeVisible()
    expect(bodies('POST /account/merge')).toHaveLength(0)
  })

  it('starts on the form again the next time it opens', async () => {
    mockApi({ 'POST /auth/register': { status: 201, body: session } })
    const { user } = await renderWithProviders(<AuthDialog />)

    await signUp(user)
    await heading('Welcome to DriveThruRPG')
    await user.click(within(dialog()).getByRole('button', { name: 'Close' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )

    act(() => useAuthDialogStore.getState().openAuth('register'))
    expect(await heading('Create your account')).toBeVisible()
  })

  it('continues to the page that asked for login after a social sign-up', async () => {
    mockApi({
      'POST /auth/social/google': { body: { ...session, isNew: true } },
    })
    const { user, router } = await renderWithProviders(<AuthDialog />)

    act(() =>
      useAuthDialogStore
        .getState()
        .openAuth('register', { redirectTo: '/wishlist' }),
    )
    await heading('Create your account')
    await user.click(
      within(dialog()).getByRole('button', { name: 'Continue with Google' }),
    )

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(router.history.location.pathname).toBe('/wishlist')
  })
})

describe('closing the modal', () => {
  it.each([
    ['the close button', 'button'],
    ['Esc', 'escape'],
  ])('closes with %s', async (_name, how) => {
    mockApi()
    const { user } = await renderWithProviders(<AuthDialog />)

    act(() => useAuthDialogStore.getState().openAuth('login'))
    await heading('Welcome back')
    if (how === 'button')
      await user.click(within(dialog()).getByRole('button', { name: 'Close' }))
    else await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(useAuthDialogStore.getState().open).toBe(false)
  })
})

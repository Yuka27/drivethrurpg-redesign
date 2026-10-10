import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

import { LoginForm } from './login-form'
import { getAuthToken } from '@/lib/auth-token'
import { apiError, cart, mockApi, session } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const TOKEN_KEY = 'dtrpg-auth-token'

// the modal's callbacks; tests that check one pass their own
const modal = () => ({
  onSuccess: vi.fn(),
  onSwitchToRegister: vi.fn(),
  onForgotPassword: vi.fn(),
})

const email = () => screen.getByRole('textbox', { name: 'Email' })
const password = () => screen.getByLabelText('Password')
const submit = () => screen.getByRole('button', { name: 'Log in' })

describe('LoginForm', () => {
  it('validates in the browser and focuses the first invalid field', async () => {
    const { fetchMock } = mockApi()
    const { user } = await renderWithProviders(<LoginForm {...modal()} />)

    await user.click(submit())

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(email()).toHaveFocus()
    expect(email()).toHaveAttribute('aria-invalid', 'true')
    const writes = fetchMock.mock.calls.filter(
      ([, init]) => init?.method !== 'GET',
    )
    expect(writes).toHaveLength(0)
  })

  it('logs in, remembers the session and reports success', async () => {
    const { bodies } = mockApi({ 'POST /auth/login': { body: session } })
    const onSuccess = vi.fn()
    const { user } = await renderWithProviders(
      <LoginForm {...modal()} onSuccess={onSuccess} />,
    )

    await user.type(email(), 'test@example.com')
    await user.type(password(), 'correct-password')
    await user.click(submit())

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(bodies('POST /auth/login')).toEqual([
      {
        email: 'test@example.com',
        password: 'correct-password',
        remember: true,
      },
    ])
    expect(getAuthToken()).toBe('token_test')
    expect(localStorage.getItem(TOKEN_KEY)).toBe('token_test')
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('keeps the session for this tab only when "Remember me" is off', async () => {
    const { bodies } = mockApi({ 'POST /auth/login': { body: session } })
    const onSuccess = vi.fn()
    const { user } = await renderWithProviders(
      <LoginForm {...modal()} onSuccess={onSuccess} />,
    )

    await user.type(email(), 'test@example.com')
    await user.type(password(), 'correct-password')
    await user.click(
      screen.getByRole('checkbox', { name: 'Remember me on this device' }),
    )
    await user.click(submit())

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(bodies('POST /auth/login')[0]).toMatchObject({ remember: false })
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe('token_test')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('shows a wrong password form-wide and clears it once the user edits', async () => {
    mockApi({ 'POST /auth/login': apiError(401, 'invalid_credentials') })
    const onSuccess = vi.fn()
    const { user } = await renderWithProviders(
      <LoginForm {...modal()} onSuccess={onSuccess} />,
    )

    await user.type(email(), 'test@example.com')
    await user.type(password(), 'wrong')
    await user.click(submit())

    expect(await screen.findByText('Wrong email or password.')).toBeVisible()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(getAuthToken()).toBeNull()

    await user.type(password(), 'x')
    expect(
      screen.queryByText('Wrong email or password.'),
    ).not.toBeInTheDocument()
  })

  it('puts an API error on the field it names', async () => {
    mockApi({
      'POST /auth/login': apiError(422, 'invalid_email', { field: 'email' }),
    })
    const { user } = await renderWithProviders(<LoginForm {...modal()} />)

    await user.type(email(), 'test@example.com')
    await user.type(password(), 'whatever')
    await user.click(submit())

    expect(
      await screen.findByText('Enter a valid email address.'),
    ).toBeVisible()
    expect(email()).toHaveAttribute('aria-invalid', 'true')
    expect(email()).toHaveFocus()
  })

  it('disables the buttons while logging in', async () => {
    let finish!: () => void
    mockApi({
      'POST /auth/login': () =>
        new Promise((resolve) => {
          finish = () => resolve({ body: session })
        }),
    })
    const { user } = await renderWithProviders(<LoginForm {...modal()} />)

    await user.type(email(), 'test@example.com')
    await user.type(password(), 'correct-password')
    await user.click(submit())

    const pending = await screen.findByRole('button', { name: 'Logging in…' })
    expect(pending).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Continue with Google' }),
    ).toBeDisabled()

    finish()
    await waitFor(() => expect(submit()).toBeEnabled())
  })

  describe('guest cart', () => {
    it('moves a non-empty guest cart into the account', async () => {
      const { bodies } = mockApi({
        'GET /cart': { body: cart(2) },
        'POST /auth/login': { body: session },
        'POST /account/merge': { body: { merged: { cart: 2 } } },
      })
      const onSuccess = vi.fn()
      const { user } = await renderWithProviders(
        <LoginForm {...modal()} onSuccess={onSuccess} />,
      )

      // the note promises the cart is kept
      expect(await screen.findByText(/Your cart \(2 items\)/)).toBeVisible()

      await user.type(email(), 'test@example.com')
      await user.type(password(), 'correct-password')
      await user.click(submit())

      await waitFor(() => expect(bodies('POST /account/merge')).toHaveLength(1))
      expect(onSuccess).toHaveBeenCalled()
    })

    it('does not merge an empty cart', async () => {
      const { bodies } = mockApi({ 'POST /auth/login': { body: session } })
      const onSuccess = vi.fn()
      const { user } = await renderWithProviders(
        <LoginForm {...modal()} onSuccess={onSuccess} />,
      )

      await user.type(email(), 'test@example.com')
      await user.type(password(), 'correct-password')
      await user.click(submit())

      await waitFor(() => expect(onSuccess).toHaveBeenCalled())
      expect(bodies('POST /account/merge')).toHaveLength(0)
      expect(screen.queryByText(/Your cart/)).not.toBeInTheDocument()
    })
  })

  it('signs in with a social provider', async () => {
    mockApi({
      'POST /auth/social/google': { body: { ...session, isNew: false } },
    })
    const onSuccess = vi.fn()
    const { user } = await renderWithProviders(
      <LoginForm {...modal()} onSuccess={onSuccess} />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Continue with Google' }),
    )

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    expect(getAuthToken()).toBe('token_test')
  })

  it('prefills the email and switches to register inside the modal', async () => {
    mockApi()
    const onSwitchToRegister = vi.fn()
    const { user } = await renderWithProviders(
      <LoginForm
        {...modal()}
        defaultEmail="from@register.com"
        onSwitchToRegister={onSwitchToRegister}
      />,
    )

    expect(email()).toHaveValue('from@register.com')
    await user.click(screen.getByRole('button', { name: 'Register here' }))
    expect(onSwitchToRegister).toHaveBeenCalledTimes(1)
  })

  it('"Forgot password?" switches view in the modal, keeping the email', async () => {
    mockApi()
    const onForgotPassword = vi.fn()
    const { user } = await renderWithProviders(
      <LoginForm {...modal()} onForgotPassword={onForgotPassword} />,
    )

    await user.type(email(), ' arya@example.com ')
    await user.click(screen.getByRole('button', { name: 'Forgot password?' }))
    expect(onForgotPassword).toHaveBeenCalledWith('arya@example.com')
  })
})

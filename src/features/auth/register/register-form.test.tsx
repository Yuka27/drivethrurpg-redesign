import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vite-plus/test'

import { RegisterForm } from './register-form'
import { getAuthToken } from '@/lib/auth-token'
import { apiError, mockApi, session, user as me } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const email = () => screen.getByRole('textbox', { name: 'Email' })
const password = () => screen.getByLabelText('Password')
const submit = () => screen.getByRole('button', { name: 'Create account' })
const requirement = (text: RegExp) => screen.getByText(text, { selector: 'li' })

async function fillIn(
  user: ReturnType<typeof userEvent.setup>,
  values = { email: 'new@example.com', password: 'a long passphrase' },
) {
  await user.type(email(), values.email)
  await user.type(password(), values.password)
}

describe('RegisterForm', () => {
  it('lists what to fix, and each item focuses its field', async () => {
    mockApi()
    const { user } = await renderWithProviders(
      <RegisterForm onSuccess={vi.fn()} />,
    )

    await user.type(password(), 'short')
    await user.click(submit())

    const summary = await screen.findByRole('alert')
    expect(summary).toHaveTextContent('Fix 2 things to continue')
    expect(
      screen.getByText(
        'Enter a valid email address, for example name@example.com.',
      ),
    ).toBeVisible()
    expect(screen.getByText('Use at least 10 characters.')).toBeVisible()
    expect(email()).toHaveFocus()

    await user.click(
      within(summary).getByRole('link', {
        name: 'Use at least 10 characters for the password',
      }),
    )
    expect(password()).toHaveFocus()
  })

  it('creates the account and hands over the user and email', async () => {
    const { bodies } = mockApi({
      'POST /auth/register': { status: 201, body: session },
    })
    const onSuccess = vi.fn()
    const { user } = await renderWithProviders(
      <RegisterForm onSuccess={onSuccess} />,
    )

    await fillIn(user)
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Send me news and offers by email',
      }),
    )
    await user.click(submit())

    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith(me, { email: 'new@example.com' }),
    )
    expect(bodies('POST /auth/register')).toEqual([
      {
        email: 'new@example.com',
        password: 'a long passphrase',
        newsletter: true,
      },
    ])
    // a new account is always remembered on this device
    expect(getAuthToken()).toBe('token_test')
    expect(localStorage.getItem('dtrpg-auth-token')).toBe('token_test')
  })

  it('locks the form while the account is being created', async () => {
    let finish!: () => void
    mockApi({
      'POST /auth/register': () =>
        new Promise((resolve) => {
          finish = () => resolve({ status: 201, body: session })
        }),
    })
    const { user } = await renderWithProviders(
      <RegisterForm onSuccess={vi.fn()} />,
    )

    await fillIn(user)
    await user.click(submit())

    expect(
      await screen.findByRole('button', { name: 'Creating account…' }),
    ).toBeDisabled()
    expect(email()).toBeDisabled()
    expect(password()).toBeDisabled()

    finish()
    await waitFor(() => expect(email()).toBeEnabled())
  })

  describe('API errors', () => {
    it('email_taken offers "Log in instead" with the typed email', async () => {
      mockApi({ 'POST /auth/register': apiError(409, 'email_taken') })
      const onSwitchToLogin = vi.fn()
      const { user } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} onSwitchToLogin={onSwitchToLogin} />,
      )

      await fillIn(user, {
        email: 'taken@example.com',
        password: 'a long passphrase',
      })
      await user.click(submit())

      expect(
        await screen.findByText(/An account with this email already exists/),
      ).toBeVisible()
      expect(email()).toHaveFocus()
      // only browser-side problems go in the summary
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Log in instead' }))
      expect(onSwitchToLogin).toHaveBeenCalledWith('taken@example.com')
    })

    it('email_taken links to /login with the email on the full page', async () => {
      mockApi({ 'POST /auth/register': apiError(409, 'email_taken') })
      const { user } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} redirect="/cart" />,
      )

      await fillIn(user, {
        email: 'taken@example.com',
        password: 'a long passphrase',
      })
      await user.click(submit())

      const link = await screen.findByRole('link', { name: 'Log in instead' })
      const href = new URL(link.getAttribute('href') ?? '', 'http://x')
      expect(href.pathname).toBe('/login')
      expect(href.searchParams.get('email')).toBe('taken@example.com')
      expect(href.searchParams.get('redirect')).toBe('/cart')
    })

    it('weak_password goes on the password field', async () => {
      mockApi({ 'POST /auth/register': apiError(422, 'weak_password') })
      const { user } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} />,
      )

      await fillIn(user)
      await user.click(submit())

      expect(
        await screen.findByText(
          'Use at least 10 characters for your password.',
        ),
      ).toBeVisible()
      expect(password()).toHaveAttribute('aria-invalid', 'true')
      expect(password()).toHaveFocus()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('other 4xx errors are shown form-wide', async () => {
      mockApi({ 'POST /auth/register': apiError(403, 'account_locked') })
      const { user } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} />,
      )

      await fillIn(user)
      await user.click(submit())

      expect(
        await screen.findByText(
          'Too many attempts. Wait a few minutes and try again.',
        ),
      ).toBeVisible()
    })

    it('a server error keeps what was typed and offers Try again', async () => {
      let calls = 0
      const { bodies } = mockApi({
        'POST /auth/register': () =>
          ++calls === 1
            ? apiError(503, 'unavailable')
            : { status: 201, body: session },
      })
      const onSuccess = vi.fn()
      const { user } = await renderWithProviders(
        <RegisterForm onSuccess={onSuccess} />,
      )

      await fillIn(user)
      await user.click(submit())

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Something went wrong on our side')
      expect(email()).toHaveValue('new@example.com')
      expect(password()).toHaveValue('a long passphrase')

      await user.click(within(alert).getByRole('button', { name: 'Try again' }))

      await waitFor(() => expect(onSuccess).toHaveBeenCalled())
      expect(bodies('POST /auth/register')).toHaveLength(2)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('a network failure is treated like a server error', async () => {
      mockApi({
        'POST /auth/register': () => Promise.reject(new TypeError('offline')),
      })
      const { user } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} />,
      )

      await fillIn(user)
      await user.click(submit())

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Something went wrong on our side',
      )
    })

    it('rate_limited blocks submitting until the countdown ends', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { bodies } = mockApi({
        'POST /auth/register': apiError(429, 'rate_limited', {
          retryAfter: 3,
        }),
      })
      const { user } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} />,
        { user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) },
      )

      await fillIn(user)
      await user.click(submit())

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Too many attempts. Try again in 3 seconds.',
      )
      expect(
        screen.getByRole('button', { name: 'Try again in 3 seconds' }),
      ).toBeDisabled()

      await act(() => vi.advanceTimersByTimeAsync(1000))
      expect(
        screen.getByRole('button', { name: 'Try again in 2 seconds' }),
      ).toBeDisabled()

      await act(() => vi.advanceTimersByTimeAsync(2000))
      expect(submit()).toBeEnabled()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(bodies('POST /auth/register')).toHaveLength(1)
    })
  })

  describe('password field', () => {
    it('rates the password and ticks the requirements as the user types', async () => {
      mockApi()
      const { user, container } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} />,
      )
      const strength = container.querySelector(
        '[data-slot="password-strength"]',
      )

      expect(strength).toBeEmptyDOMElement()
      expect(requirement(/^At least 10 characters/)).toHaveTextContent(
        '(not yet)',
      )

      await user.type(password(), 'short')
      expect(strength).toHaveTextContent('Password strength: Too short')

      await user.type(password(), ' but long enough')
      expect(strength).toHaveTextContent('Password strength: Strong')
      expect(requirement(/^At least 10 characters/)).toHaveTextContent('(done)')
      expect(requirement(/^Different from your email/)).toHaveTextContent(
        '(done)',
      )
    })

    it('flags a password that matches the email', async () => {
      mockApi()
      const { user, container } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} />,
      )

      await user.type(email(), 'same.address@example.com')
      await user.type(password(), 'Same.Address@example.com')

      expect(
        container.querySelector('[data-slot="password-strength"]'),
      ).toHaveTextContent('Password strength: Too short')
      expect(requirement(/^Different from your email/)).toHaveTextContent(
        '(not yet)',
      )
    })

    it('shows and hides the password', async () => {
      mockApi()
      const { user } = await renderWithProviders(
        <RegisterForm onSuccess={vi.fn()} />,
      )

      expect(password()).toHaveAttribute('type', 'password')
      await user.click(screen.getByRole('button', { name: 'Show password' }))
      expect(password()).toHaveAttribute('type', 'text')
      await user.click(screen.getByRole('button', { name: 'Hide password' }))
      expect(password()).toHaveAttribute('type', 'password')
    })
  })

  it('signs up with a social provider', async () => {
    mockApi({
      'POST /auth/social/roll20': { body: { ...session, isNew: true } },
    })
    const onSocialSuccess = vi.fn()
    const { user } = await renderWithProviders(
      <RegisterForm onSuccess={vi.fn()} onSocialSuccess={onSocialSuccess} />,
    )

    await user.click(
      screen.getByRole('button', { name: 'Continue with Roll20' }),
    )

    await waitFor(() => expect(onSocialSuccess).toHaveBeenCalledWith(me))
    expect(getAuthToken()).toBe('token_test')
  })
})

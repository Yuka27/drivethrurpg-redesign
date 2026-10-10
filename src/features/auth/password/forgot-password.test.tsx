import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vite-plus/test'

import { ForgotPassword } from './forgot-password'
import { apiError, mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'

// the modal's view switch; tests that check it pass their own
const modal = () => ({ onBackToLogin: vi.fn() })

const email = () => screen.getByRole('textbox', { name: 'Email' })
const submit = () => screen.getByRole('button', { name: 'Send reset link' })

describe('ForgotPassword', () => {
  it('checks the email in the browser first', async () => {
    const { bodies } = mockApi()
    const { user } = await renderWithProviders(<ForgotPassword {...modal()} />)

    await user.type(email(), 'arya@example')
    await user.click(submit())

    expect(
      await screen.findByText(
        'Enter a valid email address, for example name@example.com.',
      ),
    ).toBeVisible()
    expect(email()).toHaveFocus()
    expect(bodies('POST /auth/forgot-password')).toHaveLength(0)
  })

  it('sends the link and shows "Check your email"', async () => {
    const { bodies } = mockApi({
      'POST /auth/forgot-password': { status: 202, body: {} },
    })
    const { user } = await renderWithProviders(<ForgotPassword {...modal()} />)

    await user.type(email(), 'arya@example.com')
    await user.click(submit())

    const title = await screen.findByRole('heading', {
      name: 'Check your email',
    })
    expect(title).toHaveFocus()
    expect(bodies('POST /auth/forgot-password')).toEqual([
      { email: 'arya@example.com' },
    ])
    expect(screen.getByText('arya@example.com')).toBeVisible()
    // another email has to wait a little
    expect(
      screen.getByRole('button', { name: 'Resend email in 30s' }),
    ).toBeDisabled()
  })

  it('resends once the pause is over, then waits again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { bodies } = mockApi({
      'POST /auth/forgot-password': { status: 202, body: {} },
    })
    const { user } = await renderWithProviders(
      <ForgotPassword {...modal()} />,
      {
        user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
      },
    )

    await user.type(email(), 'arya@example.com')
    await user.click(submit())
    await screen.findByRole('heading', { name: 'Check your email' })

    await act(() => vi.advanceTimersByTimeAsync(30_000))
    await user.click(screen.getByRole('button', { name: 'Resend email' }))

    await waitFor(() =>
      expect(bodies('POST /auth/forgot-password')).toHaveLength(2),
    )
    expect(
      await screen.findByRole('button', { name: 'Resend email in 30s' }),
    ).toBeDisabled()
  })

  it('"Use a different email" goes back to the form with the email kept', async () => {
    mockApi({ 'POST /auth/forgot-password': { status: 202, body: {} } })
    const { user } = await renderWithProviders(<ForgotPassword {...modal()} />)

    await user.type(email(), 'arya@example.com')
    await user.click(submit())
    await user.click(
      await screen.findByRole('button', { name: 'Use a different email' }),
    )

    expect(email()).toHaveValue('arya@example.com')
    expect(email()).toHaveFocus()
    // the resend pause is not a rate limit: no warning on the form
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(submit()).toBeEnabled()
  })

  it('rate_limited blocks sending until the countdown ends', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockApi({
      'POST /auth/forgot-password': apiError(429, 'rate_limited', {
        retryAfter: 5,
      }),
    })
    const { user } = await renderWithProviders(
      <ForgotPassword {...modal()} />,
      {
        user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
      },
    )

    await user.type(email(), 'arya@example.com')
    await user.click(submit())

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Slow down a little')
    expect(alert).toHaveTextContent('try again in 5 seconds')
    expect(
      screen.getByRole('button', { name: 'Try again in 5 seconds' }),
    ).toBeDisabled()

    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(submit()).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows other API errors under the form', async () => {
    mockApi({ 'POST /auth/forgot-password': apiError(503, 'unavailable') })
    const { user } = await renderWithProviders(<ForgotPassword {...modal()} />)

    await user.type(email(), 'arya@example.com')
    await user.click(submit())

    expect(
      await screen.findByText(
        'The service is unavailable right now. Please try again shortly.',
      ),
    ).toBeVisible()
  })

  it('goes back to log in with the email typed so far', async () => {
    mockApi()
    const onBackToLogin = vi.fn()
    const { user } = await renderWithProviders(
      <ForgotPassword
        {...modal()}
        defaultEmail="from@login.com"
        onBackToLogin={onBackToLogin}
      />,
    )

    expect(email()).toHaveValue('from@login.com')
    await user.click(screen.getByRole('button', { name: 'Back to log in' }))
    expect(onBackToLogin).toHaveBeenCalledWith('from@login.com')
  })
})

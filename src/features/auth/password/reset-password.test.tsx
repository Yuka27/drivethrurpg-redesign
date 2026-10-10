import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'

import { ResetPassword } from './reset-password'
import { apiError, mockApi } from '@/test/api'
import { renderInDialog } from '@/test/render'

// the modal's view switches; tests that check them pass their own
const modal = () => ({ onLogin: vi.fn(), onRequestNewLink: vi.fn() })

const password = () => screen.getByLabelText('New password')
const submit = () => screen.getByRole('button', { name: 'Update password' })

describe('ResetPassword', () => {
  it('only asks for length: the email is unknown here', async () => {
    mockApi()
    await renderInDialog(<ResetPassword {...modal()} token="t1" />)

    expect(
      screen.getByRole('heading', { name: 'Set a new password' }),
    ).toBeVisible()
    expect(
      screen.getByText(/^At least 10 characters/, { selector: 'li' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/^Different from your email/),
    ).not.toBeInTheDocument()
  })

  it('checks the length in the browser first', async () => {
    const { bodies } = mockApi()
    const { user } = await renderInDialog(
      <ResetPassword {...modal()} token="t1" />,
    )

    await user.type(password(), 'short')
    await user.click(submit())

    expect(await screen.findByText('Use at least 10 characters.')).toBeVisible()
    expect(password()).toHaveFocus()
    expect(bodies('POST /auth/reset-password')).toHaveLength(0)
  })

  it('saves the password with the token and shows "Password updated"', async () => {
    const { bodies } = mockApi({
      'POST /auth/reset-password': { status: 204 },
    })
    const onLogin = vi.fn()
    const { user } = await renderInDialog(
      <ResetPassword {...modal()} token="t1" onLogin={onLogin} />,
    )

    await user.type(password(), 'a long new passphrase')
    await user.click(submit())

    const title = await screen.findByRole('heading', {
      name: 'Password updated',
    })
    expect(title).toHaveFocus()
    expect(bodies('POST /auth/reset-password')).toEqual([
      { token: 't1', password: 'a long new passphrase' },
    ])

    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(onLogin).toHaveBeenCalledTimes(1)
  })

  it('shows "This link has expired" straight away without a token', async () => {
    const { fetchMock } = mockApi()
    const onRequestNewLink = vi.fn()
    const onLogin = vi.fn()
    const { user } = await renderInDialog(
      <ResetPassword
        {...modal()}
        token=""
        onRequestNewLink={onRequestNewLink}
        onLogin={onLogin}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'This link has expired' }),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Send me a new link' }))
    expect(onRequestNewLink).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Back to log in' }))
    expect(onLogin).toHaveBeenCalledTimes(1)
    expect(
      fetchMock.mock.calls.filter(([, init]) => init?.method !== 'GET'),
    ).toHaveLength(0)
  })

  it.each([
    ['token_expired', 400],
    ['token_used', 400],
    ['gone', 410],
  ])(
    'a dead link from the API (%s) shows the expired screen',
    async (code, status) => {
      mockApi({ 'POST /auth/reset-password': apiError(status, code) })
      const { user } = await renderInDialog(
        <ResetPassword {...modal()} token="old" />,
      )

      await user.type(password(), 'a long new passphrase')
      await user.click(submit())

      const title = await screen.findByRole('heading', {
        name: 'This link has expired',
      })
      expect(title).toHaveFocus()
    },
  )

  it('weak_password goes on the password field', async () => {
    mockApi({ 'POST /auth/reset-password': apiError(422, 'weak_password') })
    const { user } = await renderInDialog(
      <ResetPassword {...modal()} token="t1" />,
    )

    await user.type(password(), 'a long new passphrase')
    await user.click(submit())

    expect(
      await screen.findByText('Use at least 10 characters for your password.'),
    ).toBeVisible()
    expect(password()).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows other API errors under the form', async () => {
    mockApi({ 'POST /auth/reset-password': apiError(503, 'unavailable') })
    const { user } = await renderInDialog(
      <ResetPassword {...modal()} token="t1" />,
    )

    await user.type(password(), 'a long new passphrase')
    await user.click(submit())

    expect(
      await screen.findByText(
        'The service is unavailable right now. Please try again shortly.',
      ),
    ).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Set a new password' }),
    ).toBeVisible()
  })
})

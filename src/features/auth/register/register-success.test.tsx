import { screen, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { RegisterSuccess } from './register-success'
import { apiError, mockApi } from '@/test/api'
import { renderInDialog } from '@/test/render'

async function renderSuccess(
  props: Partial<Parameters<typeof RegisterSuccess>[0]> = {},
) {
  const onDone = vi.fn()
  const result = await renderInDialog(
    <RegisterSuccess
      email="arya@example.com"
      mergedCartItems={null}
      cartHasItems={false}
      onDone={onDone}
      {...props}
    />,
  )
  return { ...result, onDone }
}

describe('RegisterSuccess', () => {
  it('welcomes the new account and names the confirmation email', async () => {
    await renderSuccess()

    expect(
      await screen.findByRole('heading', { name: 'Welcome to DriveThruRPG' }),
    ).toHaveFocus()
    expect(screen.getByText('arya@example.com')).toBeVisible()
    expect(screen.queryByText(/saved to your account/)).toBeNull()
  })

  it('continues to the cart it just saved', async () => {
    const { user, router, onDone } = await renderSuccess({
      cartHasItems: true,
      mergedCartItems: 2,
    })

    expect(
      screen.getByText('2 items from your cart were saved to your account.'),
    ).toBeVisible()
    await user.click(
      screen.getByRole('button', { name: 'Continue to your cart' }),
    )

    expect(router.state.location.pathname).toBe('/cart')
    expect(onDone).toHaveBeenCalled()
  })

  it('just closes when there is no cart to go back to', async () => {
    const { user, router, onDone } = await renderSuccess()

    await user.click(screen.getByRole('button', { name: 'Continue shopping' }))

    expect(router.state.location.pathname).toBe('/')
    expect(onDone).toHaveBeenCalled()
  })

  it('changes a mistyped email and sends the link there', async () => {
    const success = vi.spyOn(toast, 'success')
    const { bodies } = mockApi({
      'POST /account/email/change': { body: {} },
    })
    const { user } = await renderSuccess()

    await user.click(screen.getByRole('button', { name: 'Change it' }))
    await user.type(
      screen.getByRole('textbox', { name: 'New email address' }),
      ' arya.stark@example.com ',
    )
    await user.click(
      screen.getByRole('button', { name: 'Send confirmation link' }),
    )

    expect(await screen.findByText('arya.stark@example.com')).toBeVisible()
    expect(bodies('POST /account/email/change')).toEqual([
      { email: 'arya.stark@example.com' },
    ])
    expect(success).toHaveBeenCalledWith(
      'We sent a confirmation link to arya.stark@example.com.',
    )
    expect(
      screen.queryByRole('textbox', { name: 'New email address' }),
    ).toBeNull()
  })

  it('keeps the form open with the error when the email is taken', async () => {
    mockApi({
      'POST /account/email/change': apiError(409, 'email_taken', {
        field: 'email',
      }),
    })
    const { user } = await renderSuccess()

    await user.click(screen.getByRole('button', { name: 'Change it' }))
    await user.type(
      screen.getByRole('textbox', { name: 'New email address' }),
      'taken@example.com',
    )
    await user.click(
      screen.getByRole('button', { name: 'Send confirmation link' }),
    )

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeVisible()
    expect(screen.getByText('arya@example.com')).toBeVisible()
  })

  it('sends the confirmation email again', async () => {
    const success = vi.spyOn(toast, 'success')
    const { user } = await renderSuccess()

    await user.click(screen.getByRole('button', { name: 'Send it again' }))

    await waitFor(() =>
      expect(success).toHaveBeenCalledWith(
        'We sent the confirmation email again.',
      ),
    )
  })
})

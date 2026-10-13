import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { NewsletterForm } from './newsletter-form'
import { apiError, mockApi } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const email = () => screen.getByRole('textbox', { name: 'Email address' })
const subscribe = () => screen.getByRole('button', { name: 'Subscribe' })

describe('NewsletterForm', () => {
  it('subscribes, then confirms in place of the field', async () => {
    const { bodies } = mockApi({
      'POST /newsletter/subscribe': { status: 201, body: { subscribed: true } },
    })
    const { user } = await renderWithProviders(<NewsletterForm />)

    await user.type(email(), 'bran@example.com')
    await user.click(subscribe())

    const done = await screen.findByText(
      "You're subscribed. Watch your inbox for new releases.",
    )
    expect(done.parentElement).toHaveFocus()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(bodies('POST /newsletter/subscribe')).toEqual([
      { email: 'bran@example.com' },
    ])
  })

  it('checks the address before sending anything', async () => {
    const { bodies } = mockApi()
    const { user } = await renderWithProviders(<NewsletterForm />)

    await user.type(email(), 'not-an-email')
    await user.click(subscribe())

    expect(await screen.findByText(/Enter a valid email address/)).toBeVisible()
    expect(bodies('POST /newsletter/subscribe')).toEqual([])
  })

  it('shows a form-wide error, and clears it once the address changes', async () => {
    mockApi({ 'POST /newsletter/subscribe': apiError(429, 'rate_limited') })
    const { user } = await renderWithProviders(<NewsletterForm />)

    await user.type(email(), 'bran@example.com')
    await user.click(subscribe())
    const message = 'Too many attempts. Please wait a moment and try again.'
    expect(await screen.findByText(message)).toBeVisible()

    await user.type(email(), 'x')
    expect(screen.queryByText(message)).toBeNull()
  })
})

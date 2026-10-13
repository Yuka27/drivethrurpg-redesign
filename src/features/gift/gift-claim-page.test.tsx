import { screen, waitFor, within } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vite-plus/test'

import { GiftClaimPage, maskEmail } from './gift-claim-page'
import type { Gift } from '@/api/gifts'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { apiError, mockApi, session, user } from '@/test/api'
import type { Handler, Reply } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const gift = (overrides: Partial<Gift> = {}): Gift => ({
  id: 'gft_1',
  state: 'ready',
  from: { displayName: 'Jon Snow' },
  to: { name: 'Daenerys Targaryen', email: 'daenerys@example.com' },
  message: 'Happy birthday! Time to start the campaign.',
  titles: [
    {
      id: 'ttl_eberron',
      name: 'Exploring Eberron',
      cover: null,
      formats: ['pdf'],
    },
    {
      id: 'ttl_carpathia',
      name: 'Vaesen: Mythic Carpathia',
      cover: null,
      formats: ['pdf'],
    },
  ],
  sentAt: '2026-10-06T08:00:00Z',
  expiresAt: '2027-04-06T00:00:00Z',
  claimedAt: null,
  claimedByCurrentUser: false,
  ...overrides,
})

const claimedByMe = gift({
  state: 'claimed',
  claimedAt: '2026-10-07T10:00:00Z',
  claimedByCurrentUser: true,
})

const guest = apiError(401, 'unauthorized')

function mockGift(
  body: Gift | Handler,
  me: Handler = guest,
  overrides: Record<string, Handler> = {},
) {
  return mockApi({
    'GET /me': me,
    'GET /gifts/tok_1': 'id' in body ? { body } : body,
    'GET /library': { body: { items: [] } },
    ...overrides,
  })
}

const renderGift = () => renderWithProviders(<GiftClaimPage token="tok_1" />)

describe('GiftClaimPage', () => {
  it('shows the gift, and lets a new recipient claim it with an account', async () => {
    const { bodies } = mockGift(gift(), guest, {
      'POST /auth/register': { status: 201, body: session },
      'POST /gifts/tok_1/claim': { body: { gift: claimedByMe } },
    })
    const { user: u } = await renderGift()

    const preview = await screen.findByRole('region', {
      name: '2 titles are waiting for you',
    })
    expect(within(preview).getByText('A gift from Jon Snow')).toBeVisible()
    expect(
      within(preview).getByText(
        '“Happy birthday! Time to start the campaign.”',
      ),
    ).toBeVisible()
    expect(within(preview).getByText('Exploring Eberron')).toBeVisible()

    const card = screen.getByRole('region', { name: 'Claim your gift' })
    // the gift's address is filled in
    expect(within(card).getByRole('textbox', { name: 'Email' })).toHaveValue(
      'daenerys@example.com',
    )
    const password = within(card).getByLabelText('Choose a password')
    await u.type(password, 'short')
    await u.click(
      within(card).getByRole('button', { name: 'Create account and claim' }),
    )
    expect(
      await within(card).findByText('Use at least 10 characters.'),
    ).toBeVisible()

    await u.clear(password)
    await u.type(password, 'a-long-password')
    await u.click(
      within(card).getByRole('button', { name: 'Create account and claim' }),
    )

    expect(
      await screen.findByRole('heading', {
        name: 'It’s yours. Added to your Library.',
      }),
    ).toBeVisible()
    expect(bodies('POST /auth/register')).toEqual([
      {
        email: 'daenerys@example.com',
        password: 'a-long-password',
        newsletter: false,
      },
    ])
    // claimed for the account just made
    expect(bodies('POST /gifts/tok_1/claim')).toEqual([
      { email: 'test@example.com' },
    ])
  })

  it('logs in and claims', async () => {
    const { bodies } = mockGift(gift(), guest, {
      'POST /auth/login': { body: session },
      'POST /gifts/tok_1/claim': { body: { gift: claimedByMe } },
    })
    const { user: u } = await renderGift()

    await u.click(await screen.findByRole('radio', { name: 'Log in' }))
    expect(
      screen.getByText('Log in to add these to your Library.'),
    ).toBeVisible()
    await u.type(screen.getByLabelText('Password'), 'secret')
    await u.click(screen.getByRole('button', { name: 'Log in and claim' }))

    await screen.findByRole('heading', {
      name: 'It’s yours. Added to your Library.',
    })
    expect(bodies('POST /auth/login')).toEqual([
      { email: 'daenerys@example.com', password: 'secret', remember: true },
    ])
  })

  it('claims through Roll20, Google or Facebook, as in the login modal', async () => {
    const { bodies } = mockGift(gift(), guest, {
      'POST /auth/social/roll20': { body: { ...session, isNew: false } },
      'POST /gifts/tok_1/claim': { body: { gift: claimedByMe } },
    })
    const { user: u } = await renderGift()

    // offered on both tabs
    await u.click(await screen.findByRole('radio', { name: 'Log in' }))
    for (const provider of ['Google', 'Facebook', 'Roll20'])
      expect(
        screen.getByRole('button', { name: `Continue with ${provider}` }),
      ).toBeVisible()
    await u.click(screen.getByRole('button', { name: 'Continue with Roll20' }))

    await screen.findByRole('heading', {
      name: 'It’s yours. Added to your Library.',
    })
    expect(bodies('POST /gifts/tok_1/claim')).toHaveLength(1)
  })

  it('offers "Forgot password?" by the password when logging in', async () => {
    mockGift(gift(), guest)
    const { user: u } = await renderGift()

    await screen.findByRole('radio', { name: 'Create account' })
    expect(
      screen.queryByRole('button', { name: 'Forgot password?' }),
    ).toBeNull()
    await u.click(screen.getByRole('radio', { name: 'Log in' }))
    await u.click(screen.getByRole('button', { name: 'Forgot password?' }))

    const dialog = useAuthDialogStore.getState()
    expect(dialog.view).toBe('forgot')
    expect(dialog.email).toBe('daenerys@example.com')
  })

  it('says what it is waiting for, and tells a failed claim in a toast', async () => {
    const error = vi.spyOn(toast, 'error')
    let answer: (reply: Reply) => void = () => {}
    mockGift(gift(), guest, {
      'POST /auth/register': () =>
        new Promise<Reply>((resolve) => (answer = resolve)),
      'POST /gifts/tok_1/claim': apiError(409, 'gift_already_claimed'),
    })
    const { user: u } = await renderGift()

    await u.type(
      await screen.findByLabelText('Choose a password'),
      'a-long-password',
    )
    await u.click(
      screen.getByRole('button', { name: 'Create account and claim' }),
    )
    expect(
      screen.getByRole('button', { name: 'Creating your account…' }),
    ).toBeDisabled()

    answer({ status: 201, body: session })
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith('Someone already claimed this gift.'),
    )
  })

  it('keeps a failed sign-up on the form, in an alert', async () => {
    mockGift(gift(), guest, {
      'POST /auth/register': apiError(500, 'server_error'),
    })
    const { user: u } = await renderGift()

    await u.type(
      await screen.findByLabelText('Choose a password'),
      'a-long-password',
    )
    await u.click(
      screen.getByRole('button', { name: 'Create account and claim' }),
    )

    expect(await screen.findByRole('alert')).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Create account and claim' }),
    ).toBeEnabled()
  })

  it('offers to try again when the gift does not load', async () => {
    let fail = true
    mockGift(() => (fail ? apiError(500, 'server_error') : { body: gift() }))
    const { user: u } = await renderGift()

    await u.click(await screen.findByRole('button', { name: 'Try again' }))
    fail = false
    await u.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByRole('button', { name: 'Create account and claim' }),
    ).toBeVisible()
  })

  it('takes one button when logged in', async () => {
    const { bodies } = mockGift(
      gift(),
      { body: user },
      {
        'POST /gifts/tok_1/claim': { body: { gift: claimedByMe } },
      },
    )
    const { user: u } = await renderGift()

    const card = await screen.findByRole('region', {
      name: 'Add to your Library',
    })
    expect(within(card).getByText('test@example.com')).toBeVisible()
    await u.click(within(card).getByRole('button', { name: 'Claim gift' }))

    await screen.findByRole('heading', {
      name: 'It’s yours. Added to your Library.',
    })
    expect(bodies('POST /gifts/tok_1/claim')).toEqual([
      { email: 'test@example.com' },
    ])
  })

  it('thanks the sender, if the recipient wants to', async () => {
    const { bodies } = mockGift(
      claimedByMe,
      { body: user },
      {
        'POST /gifts/tok_1/thank-you': { status: 204 },
      },
    )
    const { user: u } = await renderGift()

    const thanks = await screen.findByRole('region', {
      name: 'Say thanks to Jon Snow',
    })
    await u.type(within(thanks).getByRole('textbox'), 'Thank you!')
    await u.click(within(thanks).getByRole('button', { name: 'Send thanks' }))

    expect(await within(thanks).findByRole('status')).toHaveTextContent(
      'Thanks sent to Jon Snow.',
    )
    expect(bodies('POST /gifts/tok_1/thank-you')).toEqual([
      { message: 'Thank you!' },
    ])
  })

  it('explains a gift someone else claimed', async () => {
    mockGift(gift({ state: 'claimed', claimedAt: '2026-10-08T10:00:00Z' }), {
      body: user,
    })
    await renderGift()

    expect(
      await screen.findByRole('heading', {
        name: 'This gift was already claimed',
      }),
    ).toBeVisible()
    expect(screen.getByText(/added to a Library on Oct 8/)).toBeVisible()
  })

  it('sends a fresh link for an expired gift, to its masked address', async () => {
    const { bodies } = mockGift(gift({ state: 'expired' }), guest, {
      'POST /gifts/tok_1/resend-link': { status: 202, body: {} },
    })
    const { user: u } = await renderGift()

    expect(
      await screen.findByText(
        'Sent to d•••••@example.com. Wrong address? Ask Jon Snow to resend the gift.',
      ),
    ).toBeVisible()
    await u.click(screen.getByRole('button', { name: 'Email me a new link' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'New link sent. Check your inbox.',
    )
    expect(bodies('POST /gifts/tok_1/resend-link')).toHaveLength(1)
  })

  it('finds a gift by its code when the link does not open', async () => {
    mockGift(apiError(404, 'gift_not_found'), guest, {
      'POST /gifts/lookup': ({ body }) =>
        (body as { code: string }).code === 'GIFT-7K2M-9QXA'
          ? { body: { token: 'tok_ready' } }
          : apiError(404, 'gift_not_found'),
    })
    const { user: u, router } = await renderGift()

    const code = await screen.findByRole('textbox', { name: 'Gift code' })
    await u.type(code, 'gift-nope')
    await u.click(screen.getByRole('button', { name: 'Find my gift' }))
    expect(await screen.findByText("We couldn't find this gift.")).toBeVisible()

    await u.clear(code)
    await u.type(code, 'gift-7k2m-9qxa')
    await u.click(screen.getByRole('button', { name: 'Find my gift' }))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/gift/tok_ready'),
    )
  })
})

describe('maskEmail', () => {
  it('keeps the first letter and the domain', () => {
    expect(maskEmail('paulina@example.com')).toBe('p•••••@example.com')
  })
})

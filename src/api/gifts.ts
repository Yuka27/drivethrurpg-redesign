import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { z } from 'zod'

import { signIn } from './auth'
import { apiFetch, useRequestPrefs } from './client'
import { MeSchema } from './me'
import { queryKeys } from './query-keys'

const GiftSchema = z.object({
  id: z.string(),
  state: z.enum(['ready', 'claimed', 'expired']).catch('ready'),
  from: z.object({ displayName: z.string() }),
  to: z.object({
    name: z.string().nullish(),
    email: z.string().nullish(),
  }),
  message: z.string().nullish(),
  titles: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      cover: z.object({ url: z.string(), alt: z.string() }).nullish(),
      formats: z.array(z.string()).catch([]),
    }),
  ),
  sentAt: z.string(),
  expiresAt: z.string().nullish(),
  claimedAt: z.string().nullish(),
  claimedByCurrentUser: z.boolean().catch(false),
})
export type Gift = z.infer<typeof GiftSchema>

/**
 * GET /gifts/{token}: the gift behind the link in the email. Unknown tokens
 * answer gift_not_found (404). The mock knows tok_ready, tok_claimed,
 * tok_claimed_by_me and tok_expired.
 */
export function useGift(token: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.gifts.detail(token, prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/gifts/${token}`, { schema: GiftSchema, prefs, signal }),
  })
}

const ClaimSchema = z.object({
  gift: GiftSchema,
  /** a claim can sign the recipient in */
  user: MeSchema.nullish().catch(null),
  token: z.string().nullish(),
})

/**
 * POST /gifts/{token}/claim: the titles go to the library of the account with
 * this email (errors: gift_already_claimed 409, gift_expired 410).
 */
export function useClaimGift(token: string) {
  const queryClient = useQueryClient()
  const prefs = useRequestPrefs()
  return useMutation({
    mutationKey: claimKey(token),
    mutationFn: (email: string) =>
      apiFetch(`/gifts/${token}/claim`, {
        method: 'POST',
        body: { email },
        schema: ClaimSchema,
      }),
    onSuccess: ({ gift, user, token: session }) => {
      queryClient.setQueryData(queryKeys.gifts.detail(token, prefs), gift)
      if (user && session) signIn(queryClient, { user, token: session }, true)
      void queryClient.invalidateQueries({ queryKey: ['library'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
  })
}

const claimKey = (token: string) => ['gifts', 'claim', token] as const

/**
 * Whether this gift's claim is on its way, from whichever card sent it: the
 * logged-out card signs the recipient in first, so the logged-in card takes
 * its place while the claim is still running.
 */
export const useIsClaiming = (token: string) =>
  useIsMutating({ mutationKey: claimKey(token) }) > 0

/** POST /gifts/{token}/resend-link (202): a fresh link to the gift's email. */
export function useResendGiftLink(token: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch(`/gifts/${token}/resend-link`, {
        method: 'POST',
        body: {},
        schema: z.unknown(),
      }),
  })
}

/** POST /gifts/{token}/thank-you (204): a note to the sender, by email. */
export function useThankSender(token: string) {
  return useMutation({
    mutationFn: (message: string) =>
      apiFetch(`/gifts/${token}/thank-you`, {
        method: 'POST',
        body: { message },
        schema: z.unknown(),
      }),
  })
}

/** POST /gifts/lookup: the code printed in the email (GIFT-7K2M-9QXA) to its token. */
export function useLookupGift() {
  return useMutation({
    mutationFn: (code: string) =>
      apiFetch('/gifts/lookup', {
        method: 'POST',
        body: { code },
        schema: z.object({ token: z.string() }),
      }),
  })
}

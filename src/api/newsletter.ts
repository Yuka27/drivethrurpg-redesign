import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch } from './client'

/** Checked before sending (the form shows errors.invalid_email); the API's 422 is the second check. */
export const NewsletterEmailSchema = z.email().max(254)

const SubscribeResponseSchema = z.object({ subscribed: z.literal(true) })

/** POST /newsletter/subscribe */
export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch('/newsletter/subscribe', {
        method: 'POST',
        body: { email },
        schema: SubscribeResponseSchema,
      }),
  })
}

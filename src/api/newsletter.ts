import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch } from './client'
import { message } from '@/lib/forms'

/** Checked in the browser first; the API's 422 invalid_email (field "email") is the second check. */
export const NewsletterRequestSchema = z.object({
  email: z
    .email({ error: message('validation.emailInvalid') })
    .max(254, { error: message('validation.emailInvalid') }),
})
export type NewsletterRequest = z.infer<typeof NewsletterRequestSchema>

const SubscribeResponseSchema = z.object({ subscribed: z.literal(true) })

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: ({ email }: NewsletterRequest) =>
      apiFetch('/newsletter/subscribe', {
        method: 'POST',
        body: { email },
        schema: SubscribeResponseSchema,
      }),
  })
}

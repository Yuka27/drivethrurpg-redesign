import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'

import { apiFetch } from './client'
import { MeSchema } from './me'
import type { Me } from './me'
import { queryKeys } from './query-keys'
import { i18n } from '@/i18n'
import { message } from '@/lib/forms'

const AuthResponseSchema = z.object({ user: MeSchema, token: z.string() })

/** What the login form sends. Checked in the browser first; the API checks again. */
export const LoginRequestSchema = z.object({
  email: z
    .email({ error: message('validation.emailInvalid') })
    .max(254, { error: message('validation.emailInvalid') }),
  password: z
    .string()
    .min(1, { error: message('validation.passwordRequired') }),
  remember: z.boolean(),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const SOCIAL_PROVIDERS = ['roll20', 'google', 'facebook'] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

/** Put the user in every cached /me, so the whole UI switches to logged in at once. */
function useSignedIn() {
  const queryClient = useQueryClient()
  return (user: Me) => {
    queryClient.setQueriesData({ queryKey: queryKeys.me.all }, user)
    void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
  }
}

/**
 * POST /auth/login. Errors are shown in the form (useApiError): the mock answers
 * password "wrong" with invalid_credentials and "locked" with account_locked.
 */
export function useLogin() {
  const signedIn = useSignedIn()
  return useMutation({
    mutationFn: (request: LoginRequest) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: request,
        schema: AuthResponseSchema,
      }),
    onSuccess: ({ user }) => signedIn(user),
  })
}

/**
 * POST /auth/social/{provider}. The mock signs in straight away; a real provider
 * would redirect to its consent screen first.
 */
export function useSocialLogin() {
  const signedIn = useSignedIn()
  return useMutation({
    mutationFn: (provider: SocialProvider) =>
      apiFetch(`/auth/social/${provider}`, {
        method: 'POST',
        schema: AuthResponseSchema.extend({ isNew: z.boolean() }),
      }),
    onSuccess: ({ user }) => signedIn(user),
  })
}

/** POST /auth/logout (204). Every cached /me becomes null, so the UI switches to guest at once. */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch('/auth/logout', { method: 'POST', schema: z.null() }),
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: queryKeys.me.all }, null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
    onError: () => toast.error(i18n.t('auth.logoutFailed')),
  })
}

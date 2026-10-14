import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { z } from 'zod'

import { apiFetch } from './client'
import { MeSchema } from './me'
import type { Me } from './me'
import { queryKeys } from './query-keys'
import {
  clearAuthToken,
  setAuthToken,
  subscribeAuthToken,
} from '@/lib/auth-token'
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

/** Minimum the API accepts (shorter passwords get weak_password). */
export const PASSWORD_MIN_LENGTH = 10

/** POST /auth/register body. Length is the only hard rule; strength is advice in the UI. */
export const RegisterRequestSchema = z.object({
  email: z
    .email({ error: message('validation.emailInvalidExample') })
    .max(254, { error: message('validation.emailInvalidExample') }),
  password: z.string().min(PASSWORD_MIN_LENGTH, {
    error: message('validation.passwordMinLength'),
  }),
  newsletter: z.boolean(),
})
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>

export const SOCIAL_PROVIDERS = ['google', 'facebook', 'roll20'] as const
export type SocialProvider = (typeof SOCIAL_PROVIDERS)[number]

/**
 * Store the session and show the user everywhere at once. The response already
 * carries the current user, so /me is only marked stale, not fetched again.
 */
export function signIn(
  queryClient: QueryClient,
  { user, token }: { user: Me; token: string },
  remember: boolean,
) {
  setAuthToken(token, { remember })
  queryClient.setQueriesData({ queryKey: queryKeys.me.all }, user)
  void queryClient.invalidateQueries({
    queryKey: queryKeys.me.all,
    refetchType: 'none',
  })
}

/**
 * POST /auth/login. Errors are shown in the form (useApiError): the mock answers
 * password "wrong" with invalid_credentials and "locked" with account_locked.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: LoginRequest) =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: request,
        schema: AuthResponseSchema,
      }),
    onSuccess: (session, request) =>
      signIn(queryClient, session, request.remember),
  })
}

/** POST /auth/register (201). A new account is remembered on this device. */
export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: RegisterRequest) =>
      apiFetch('/auth/register', {
        method: 'POST',
        body: request,
        schema: AuthResponseSchema,
      }),
    onSuccess: (session) => {
      signIn(queryClient, session, true)
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

/**
 * POST /auth/social/{provider}. The mock signs in straight away.
 * TODO(oauth): a real provider redirects to its consent screen first and comes
 * back to a callback route that finishes the sign-in.
 */
export function useSocialLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: SocialProvider) =>
      apiFetch(`/auth/social/${provider}`, {
        method: 'POST',
        schema: AuthResponseSchema.extend({ isNew: z.boolean() }),
      }),
    onSuccess: (session) => signIn(queryClient, session, true),
  })
}

/**
 * POST /auth/logout (204). The session ends on this device even when the
 * request fails: the user asked to log out, so they must not stay logged in.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch('/auth/logout', { method: 'POST', schema: z.null() }),
    onSettled: () => {
      clearAuthToken()
      queryClient.setQueriesData({ queryKey: queryKeys.me.all }, null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

const MergeResponseSchema = z.object({
  merged: z.record(z.string(), z.number()),
})

/** POST /account/merge: move the guest cart and wishlist into the account just created. */
export function useMergeGuestData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch('/account/merge', {
        method: 'POST',
        schema: MergeResponseSchema,
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    },
  })
}

/** "Forgot your password?" form. */
export const ForgotPasswordRequestSchema = z.object({
  email: z
    .email({ error: message('validation.emailInvalidExample') })
    .max(254, { error: message('validation.emailInvalidExample') }),
})
export type ForgotPasswordRequest = z.infer<typeof ForgotPasswordRequestSchema>

/**
 * POST /auth/forgot-password (202). Always "sent", whether or not the address has
 * an account, so the form cannot be used to find out who is registered.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (request: ForgotPasswordRequest) =>
      apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: request,
        schema: z.unknown(),
      }),
  })
}

/** "Set a new password" form; the token comes from the link in the email. */
export const ResetPasswordRequestSchema = z.object({
  password: z.string().min(PASSWORD_MIN_LENGTH, {
    error: message('validation.passwordMinLength'),
  }),
})
export type ResetPasswordRequest = z.infer<typeof ResetPasswordRequestSchema>

/**
 * Error codes meaning the reset link can no longer be used (too old, already
 * used, or not a real token). The mock API never returns them (it answers 204 to
 * anything); they are what a real backend would send.
 */
export const DEAD_RESET_LINK_CODES = new Set([
  'token_expired',
  'token_invalid',
  'token_used',
])

/** POST /auth/reset-password (204). Does not sign in: the user logs in with the new password. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (request: ResetPasswordRequest & { token: string }) =>
      apiFetch('/auth/reset-password', {
        method: 'POST',
        body: request,
        schema: z.null(),
      }),
  })
}

export const ChangeEmailRequestSchema = z.object({
  email: z
    .email({ error: message('validation.emailInvalidExample') })
    .max(254, { error: message('validation.emailInvalidExample') }),
})
export type ChangeEmailRequest = z.infer<typeof ChangeEmailRequestSchema>

/** POST /account/email/change (202): sends a confirmation link to the new address. */
export function useChangeEmail() {
  return useMutation({
    mutationFn: (request: ChangeEmailRequest) =>
      apiFetch('/account/email/change', {
        method: 'POST',
        body: request,
        schema: z.unknown(),
      }),
  })
}

/**
 * Resend the confirmation email.
 * TODO(api): there is no endpoint for this yet; replace the stub when it exists.
 */
export function useResendConfirmation() {
  return useMutation({
    mutationFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 400))
    },
  })
}

/**
 * Mount once (root route). When the token goes away (a 401 or a logout in
 * another tab) the UI becomes a guest at once; a login in another tab is picked
 * up by refetching /me.
 */
export function useAuthSync() {
  const queryClient = useQueryClient()
  useEffect(
    () =>
      subscribeAuthToken((token, { fromOtherTab }) => {
        if (token === null) {
          queryClient.setQueriesData({ queryKey: queryKeys.me.all }, null)
        } else if (fromOtherTab) {
          // this tab's own logins already put the user in the cache (signIn)
          void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
        }
      }),
    [queryClient],
  )
}

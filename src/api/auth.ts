import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'

import { apiFetch } from './client'
import { MeSchema } from './me'
import { queryKeys } from './query-keys'
import { i18n } from '@/i18n'

const LoginResponseSchema = z.object({ user: MeSchema, token: z.string() })

// TEMPORARY until the real login form exists: the mock accepts any password
// except "wrong" and "locked", so these demo credentials always log in.
const DEMO_CREDENTIALS = {
  email: 'arya@example.com',
  password: 'demo-password',
}

/** POST /auth/login. For now always with the demo credentials (see above). */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch('/auth/login', {
        method: 'POST',
        body: DEMO_CREDENTIALS,
        schema: LoginResponseSchema,
      }),
    onSuccess: ({ user }) => {
      queryClient.setQueriesData({ queryKey: queryKeys.me.all }, user)
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
    onError: () => toast.error(i18n.t('auth.loginFailed')),
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

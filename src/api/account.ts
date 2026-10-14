import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { PASSWORD_MIN_LENGTH } from './auth'
import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'
import { clearAuthToken } from '@/lib/auth-token'
import { message } from '@/lib/forms'

const ConnectedAccountSchema = z.object({
  provider: z.string(),
  email: z.string(),
  connectedAt: z.string(),
})

/** GET /account/connected: only the providers that are linked. */
export function useConnectedAccounts() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.account.connected(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/account/connected', {
        schema: z.array(ConnectedAccountSchema),
        prefs,
        signal,
      }),
  })
}

export function useDisconnectAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (provider: string) =>
      apiFetch(`/account/connected/${provider}`, {
        method: 'DELETE',
        schema: z.unknown(),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['account', 'connected'] }),
  })
}

const AddressSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().nullish(),
  city: z.string(),
  region: z.string().nullish(),
  postalCode: z.string(),
  /** ISO 3166-1 alpha-2, e.g. "PL" */
  country: z.string(),
  phone: z.string().nullish(),
  isDefault: z.boolean(),
})
export type Address = z.infer<typeof AddressSchema>

export function useAddresses() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.account.addresses(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/account/addresses', {
        schema: z.array(AddressSchema),
        prefs,
        signal,
      }),
  })
}

export function useRemoveAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/account/addresses/${id}`, {
        method: 'DELETE',
        schema: z.unknown(),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['account', 'addresses'] }),
  })
}

const PaymentMethodSchema = z.object({
  id: z.string(),
  /** "visa", "mastercard"… */
  brand: z.string(),
  last4: z.string(),
  expMonth: z.number().int(),
  expYear: z.number().int(),
  isDefault: z.boolean(),
})
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>

/** GET /account/payment-methods: saved cards (last 4 digits only). */
export function usePaymentMethods() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.account.paymentMethods(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/account/payment-methods', {
        schema: z.array(PaymentMethodSchema),
        prefs,
        signal,
      }),
  })
}

export function useRemovePaymentMethod() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/account/payment-methods/${id}`, {
        method: 'DELETE',
        schema: z.unknown(),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['account', 'payment-methods'],
      }),
  })
}

export const ChangePasswordRequestSchema = z.object({
  currentPassword: z
    .string()
    .min(1, { error: message('validation.passwordRequired') }),
  password: z.string().min(PASSWORD_MIN_LENGTH, {
    error: message('validation.passwordMinLength'),
  }),
})
export type ChangePasswordRequest = z.infer<typeof ChangePasswordRequestSchema>

/**
 * POST /account/password (204). The spec does not describe the body; this sends
 * the current password (to prove it is the owner) and the new one.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, password }: ChangePasswordRequest) =>
      apiFetch('/account/password', {
        method: 'POST',
        body: { currentPassword, newPassword: password },
        schema: z.unknown(),
      }),
  })
}

/**
 * POST /account/delete (202: deletion is scheduled). The session ends here, the
 * same way as a logout.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch('/account/delete', { method: 'POST', schema: z.unknown() }),
    onSuccess: () => {
      clearAuthToken()
      queryClient.setQueriesData({ queryKey: queryKeys.me.all }, null)
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.account.all })
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
    },
  })
}

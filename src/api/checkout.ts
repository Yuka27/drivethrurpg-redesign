import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { CartSchema } from './cart'
import { apiFetch, MoneySchema, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

export const CheckoutAddressSchema = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().nullish(),
  city: z.string(),
  postalCode: z.string(),
  /** ISO 3166 code: "PL" */
  country: z.string(),
})
export type CheckoutAddress = z.infer<typeof CheckoutAddressSchema>

const RateSchema = z.object({
  id: z.string(),
  label: z.string(),
  eta: z.string().nullish(),
  price: MoneySchema,
})
export type ShippingRate = z.infer<typeof RateSchema>

const SessionSchema = z.object({
  id: z.string(),
  cart: CartSchema,
  contactEmail: z.string().nullish(),
  shippingAddress: CheckoutAddressSchema.nullish().catch(null),
  shippingRate: RateSchema.nullish().catch(null),
  /** 0.23: the VAT rate inside the prices */
  taxRate: z.number().catch(0),
  /** the VAT already inside the total (EU prices include it) */
  vatIncluded: MoneySchema.nullish().catch(null),
  total: MoneySchema,
  /** a printed item: there is shipping to choose */
  requiresShipping: z.boolean().catch(false),
})
export type CheckoutSession = z.infer<typeof SessionSchema>

/**
 * POST /checkout: a session for the cart as it is now, kept for this visit to
 * the page (no refetching it behind the buyer's back). Later steps answer with
 * the updated session, which replaces this one.
 */
export function useCheckoutSession() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.checkout.session(prefs),
    queryFn: () =>
      apiFetch('/checkout', {
        method: 'POST',
        body: {},
        schema: SessionSchema,
        prefs,
      }),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

/** GET /checkout/{id}/shipping-rates: Standard, Express… */
export function useShippingRates(sessionId: string | undefined) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.checkout.rates(sessionId ?? '', prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/checkout/${sessionId}/shipping-rates`, {
        schema: z.array(RateSchema),
        prefs,
        signal,
      }),
    enabled: sessionId !== undefined,
  })
}

/** A step that answers with the session: it replaces the cached one. */
function useSessionStep<V>(
  request: (sessionId: string, variables: V) => Promise<CheckoutSession>,
) {
  const queryClient = useQueryClient()
  const prefs = useRequestPrefs()
  return useMutation({
    mutationFn: ({ sessionId, ...variables }: { sessionId: string } & V) =>
      request(sessionId, variables as V),
    onSuccess: (session) =>
      queryClient.setQueryData(queryKeys.checkout.session(prefs), session),
  })
}

/** PUT /checkout/{id}/shipping-rate: the total changes with it. */
export const useChooseShippingRate = () =>
  useSessionStep((sessionId, { rateId }: { rateId: string }) =>
    apiFetch(`/checkout/${sessionId}/shipping-rate`, {
      method: 'PUT',
      body: { rateId },
      schema: SessionSchema,
    }),
  )

export type PlaceOrder = {
  sessionId: string
  email: string
  billing: CheckoutAddress
  /** printed items only */
  shipping?: CheckoutAddress
  /** a saved card's id, or the stand-in for a new card or wallet */
  paymentMethodId: string
}

const PlacedOrderSchema = z.object({ id: z.string(), number: z.string() })

/**
 * "Pay": the steps a payment provider's flow would take, in order: contact
 * email, addresses (PUT …/contact, …/shipping-address, …/billing-address),
 * the payment intent, then POST …/place-order. A declined payment fails with
 * payment_declined (402) and nothing is charged.
 */
export function usePlaceOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      sessionId,
      email,
      billing,
      shipping,
      paymentMethodId,
    }: PlaceOrder) => {
      const step = (
        path: string,
        body: unknown,
        method: 'PUT' | 'POST' = 'PUT',
      ) =>
        apiFetch(`/checkout/${sessionId}/${path}`, {
          method,
          body,
          schema: z.unknown(),
        })
      await step('contact', { email })
      if (shipping) await step('shipping-address', shipping)
      await step('billing-address', billing)
      await step('payment-intent', {}, 'POST')
      return apiFetch(`/checkout/${sessionId}/place-order`, {
        method: 'POST',
        body: { paymentMethodId },
        schema: PlacedOrderSchema,
      })
    },
    onSuccess: () => {
      // the cart is now the order; the header's cart badge comes with /me
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.all })
      void queryClient.invalidateQueries({ queryKey: ['library'] })
    },
  })
}

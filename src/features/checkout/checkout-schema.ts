import { z } from 'zod'

import type { CheckoutAddress } from '@/api/checkout'
import type { Address } from '@/api/account'
import { message } from '@/lib/forms'

/** The countries offered first; the API takes ISO codes. */
export const COUNTRIES = ['PL', 'DE', 'FR', 'GB', 'US', 'CA'] as const

export const PAYMENT_METHODS = ['card', 'paypal', 'apple_pay'] as const
export type PaymentMethodKind = (typeof PAYMENT_METHODS)[number]

const addressFields = {
  country: z.string(),
  firstName: z.string().trim(),
  lastName: z.string().trim(),
  line1: z.string().trim(),
  postalCode: z.string().trim(),
  city: z.string().trim(),
}
const AddressFieldsSchema = z.object(addressFields)
export type AddressFields = z.infer<typeof AddressFieldsSchema>

export const emptyAddress = (country = 'PL'): AddressFields => ({
  country,
  firstName: '',
  lastName: '',
  line1: '',
  postalCode: '',
  city: '',
})

const CheckoutFormSchema = z.object({
  email: z.string().trim(),
  /** a saved address picked instead of typing one ('' = typing one) */
  savedAddressId: z.string(),
  billing: AddressFieldsSchema,
  /** printed items go to the billing address (else to `shipping`) */
  shipToBilling: z.boolean(),
  shipping: AddressFieldsSchema,
  method: z.enum(PAYMENT_METHODS),
  /** a saved card ('' = a new card) */
  savedCardId: z.string(),
  card: z.object({
    number: z.string(),
    expiry: z.string(),
    cvc: z.string(),
  }),
})
export type CheckoutForm = z.infer<typeof CheckoutFormSchema>

const REQUIRED: Record<
  keyof AddressFields,
  Parameters<typeof message>[0] | null
> = {
  country: null,
  firstName: 'validation.firstNameRequired',
  lastName: 'validation.lastNameRequired',
  line1: 'validation.addressRequired',
  postalCode: 'validation.postalCodeRequired',
  city: 'validation.cityRequired',
}

const digits = (value: string) => value.replace(/\D/g, '')

/** The Luhn check every card number passes. */
function luhn(number: string) {
  let sum = 0
  for (let index = 0; index < number.length; index++) {
    let digit = Number(number[number.length - 1 - index])
    if (index % 2 === 1) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
  }
  return sum % 10 === 0
}

/** "08 / 28": a month that has not ended yet. */
function validExpiry(value: string, now: Date) {
  const match = /^(\d{2})\s*\/?\s*(\d{2})$/.exec(value.trim())
  if (!match) return false
  const month = Number(match[1])
  const year = 2000 + Number(match[2])
  if (month < 1 || month > 12) return false
  return (
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1)
  )
}

/**
 * What must be filled in depends on the buyer: a guest gives an email, an
 * address is typed unless a saved one is picked, printed items need a
 * shipping address when it differs, and a new card needs its details.
 */
export function checkoutSchema({
  guest,
  requiresShipping,
  now = new Date(),
}: {
  guest: boolean
  requiresShipping: boolean
  now?: Date
}) {
  return CheckoutFormSchema.superRefine((form, context) => {
    const issue = (path: Array<string>, key: Parameters<typeof message>[0]) =>
      context.addIssue({ code: 'custom', path, message: message(key) })

    if (guest) {
      if (!form.email) issue(['email'], 'validation.emailRequired')
      else if (!z.email().safeParse(form.email).success)
        issue(['email'], 'validation.emailInvalid')
    }

    const checkAddress = (name: 'billing' | 'shipping') => {
      for (const [field, key] of Object.entries(REQUIRED))
        if (key && !form[name][field as keyof AddressFields])
          issue([name, field], key)
    }
    if (!form.savedAddressId) {
      checkAddress('billing')
      if (requiresShipping && !form.shipToBilling) checkAddress('shipping')
    }

    if (form.method === 'card' && !form.savedCardId) {
      const number = digits(form.card.number)
      if (number.length < 13 || number.length > 19 || !luhn(number))
        issue(['card', 'number'], 'validation.cardNumberInvalid')
      if (!validExpiry(form.card.expiry, now))
        issue(['card', 'expiry'], 'validation.expiryInvalid')
      if (!/^\d{3,4}$/.test(form.card.cvc.trim()))
        issue(['card', 'cvc'], 'validation.cvcInvalid')
    }
  })
}

export const toCheckoutAddress = (address: AddressFields): CheckoutAddress => ({
  fullName: `${address.firstName} ${address.lastName}`.trim(),
  line1: address.line1,
  city: address.city,
  postalCode: address.postalCode,
  country: address.country,
})

export const savedToCheckoutAddress = (address: Address): CheckoutAddress => ({
  fullName: address.fullName,
  line1: address.line1,
  line2: address.line2,
  city: address.city,
  postalCode: address.postalCode,
  country: address.country,
})

/** Stripe's test card that is always declined (the mock declines `pm_declined`). */
const DECLINED_TEST_CARD = '4000000000000002'

/**
 * There is no payment provider here: a new card becomes a stand-in method id
 * (the number never leaves the page), a saved card is its own id, and the
 * wallets have theirs.
 */
export function paymentMethodId(form: CheckoutForm) {
  if (form.method === 'paypal') return 'pm_paypal'
  if (form.method === 'apple_pay') return 'pm_apple_pay'
  if (form.savedCardId) return form.savedCardId
  return digits(form.card.number) === DECLINED_TEST_CARD
    ? 'pm_declined'
    : 'pm_card_new'
}

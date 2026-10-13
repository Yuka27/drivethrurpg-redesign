// English is bundled statically: it is the fallback for every language, and the
// source of truth for translation key types (see types.d.ts).
import account from '@/locales/en/account.json'
import auth from '@/locales/en/auth.json'
import cart from '@/locales/en/cart.json'
import checkout from '@/locales/en/checkout.json'
import common from '@/locales/en/common.json'
import library from '@/locales/en/library.json'
import listing from '@/locales/en/listing.json'
import title from '@/locales/en/title.json'

export const NAMESPACES = [
  'common',
  'listing',
  'title',
  'cart',
  'checkout',
  'account',
  'auth',
  'library',
] as const
export type Namespace = (typeof NAMESPACES)[number]

export const enResources = {
  common,
  listing,
  title,
  cart,
  checkout,
  account,
  auth,
  library,
} satisfies Record<Namespace, unknown>

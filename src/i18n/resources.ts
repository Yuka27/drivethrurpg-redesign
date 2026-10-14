// English is bundled statically: it is the fallback for every language, and the
// source of truth for translation key types (see types.d.ts).
import account from '@/locales/en/account.json'
import auth from '@/locales/en/auth.json'
import cart from '@/locales/en/cart.json'
import gift from '@/locales/en/gift.json'
import checkout from '@/locales/en/checkout.json'
import common from '@/locales/en/common.json'
import library from '@/locales/en/library.json'
import home from '@/locales/en/home.json'
import listing from '@/locales/en/listing.json'
import title from '@/locales/en/title.json'
import wishlist from '@/locales/en/wishlist.json'

export const NAMESPACES = [
  'common',
  'listing',
  'title',
  'cart',
  'checkout',
  'account',
  'auth',
  'library',
  'home',
  'wishlist',
  'gift',
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
  home,
  wishlist,
  gift,
} satisfies Record<Namespace, unknown>

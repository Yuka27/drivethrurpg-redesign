import { z } from 'zod'

import {
  LISTING_SEARCH_DEFAULTS,
  ListingSearchSchema,
} from '@/features/listing/listing-search'

/** The wishlist's orders; it knows when each title was saved, not sales or ratings. */
export const WISHLIST_SORTS = [
  'added',
  'price_asc',
  'price_desc',
  'title',
] as const
export type WishlistSort = (typeof WISHLIST_SORTS)[number]

/**
 * /wishlist?system=year_zero&onSale=true&sort=price_asc&view=list&page=2: the
 * listing's filters (same names, same panel), with the wishlist's own sorts.
 * Defaults stay out of the URL.
 */
export const WishlistSearchSchema = ListingSearchSchema.extend({
  sort: z.enum(WISHLIST_SORTS).default('added').catch('added'),
})
export type WishlistSearch = z.infer<typeof WishlistSearchSchema>

export const WISHLIST_SEARCH_DEFAULTS = {
  ...LISTING_SEARCH_DEFAULTS,
  sort: 'added' as WishlistSort,
}

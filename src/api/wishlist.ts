import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, MoneySchema, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'
import type { TitleSummary } from './titles'

const WishlistItemSchema = z.object({
  titleId: z.string(),
  title: z.string(),
  publisher: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .catch(null),
  cover: z.object({ url: z.string(), alt: z.string() }).nullable().catch(null),
  type: z.string().nullable().catch(null),
  ruleSystem: z.string().nullable().catch(null),
  genre: z.string().nullable().catch(null),
  format: z.string().nullable().catch(null),
  price: MoneySchema,
  listPrice: MoneySchema.nullable().catch(null),
  /** cheaper than when it was saved */
  priceDrop: z.boolean().catch(false),
  addedAt: z.string().catch(''),
  owned: z.boolean().catch(false),
  inCart: z.boolean().catch(false),
  aiGenerated: z.boolean().catch(false),
})
export type WishlistItem = z.infer<typeof WishlistItemSchema>

const WishlistSchema = z.object({
  items: z.array(WishlistItemSchema),
  total: z.number().int(),
})

/** Everything at once: the page filters, sorts and pages it (the API only pages). */
const ALL = 100

/**
 * GET /wishlist, the whole of it (as the library does): the API takes no
 * filters, so the page filters, counts, sorts and pages in the browser.
 */
export function useWishlist(enabled = true) {
  const prefs = useRequestPrefs()
  return useQuery({
    enabled,
    queryKey: queryKeys.wishlist(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/wishlist', {
        params: { page: 1, pageSize: ALL },
        schema: WishlistSchema,
        prefs,
        signal,
      }),
  })
}

/** On sale: cheaper than its list price. */
export const isOnSale = (item: WishlistItem) =>
  item.listPrice !== null && item.listPrice.amount > item.price.amount

/** A wishlist entry as a title card, so the listing's cards and rows show it. */
export const toTitleSummary = (item: WishlistItem): TitleSummary => ({
  id: item.titleId,
  title: item.title,
  publisher: item.publisher,
  cover: item.cover,
  type: item.type,
  ruleSystem: item.ruleSystem,
  formats: item.format ? [item.format] : [],
  price: item.price,
  listPrice: item.listPrice,
  onSale: isOnSale(item),
  // the wishlist has no ratings
  rating: null,
  owned: item.owned,
  inWishlist: true,
  // unknown here: no "shown in another language" note
  textLanguage: '',
  // the wishlist does not say
  payWhatYouWant: false,
})

const AddToCartSchema = z.object({
  skippedOwned: z.array(z.string()).catch([]),
})

/**
 * POST /wishlist/add-to-cart: several titles at once ("Add all", "Add sale
 * titles"); the API skips the ones already owned and says which.
 */
export function useAddWishlistToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (titleIds: Array<string>) =>
      apiFetch('/wishlist/add-to-cart', {
        method: 'POST',
        body: { titleIds },
        schema: AddToCartSchema,
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      // the header's cart badge counts from GET /me
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
  })
}

const SettingsSchema = z.object({
  isPublic: z.boolean().catch(false),
  shareUrl: z.string().nullable().catch(null),
})

/** GET /wishlist/settings: whether it is shared, and the link when it is. */
export function useWishlistSettings(enabled = true) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.wishlistSettings(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/wishlist/settings', { schema: SettingsSchema, prefs, signal }),
    enabled,
  })
}

/** PATCH /wishlist/settings: share it (a public link) or stop sharing. */
export function useShareWishlist() {
  const queryClient = useQueryClient()
  const prefs = useRequestPrefs()
  return useMutation({
    mutationFn: (isPublic: boolean) =>
      apiFetch('/wishlist/settings', {
        method: 'PATCH',
        body: { isPublic },
        schema: SettingsSchema,
      }),
    onSuccess: (settings) =>
      queryClient.setQueryData(queryKeys.wishlistSettings(prefs), settings),
  })
}

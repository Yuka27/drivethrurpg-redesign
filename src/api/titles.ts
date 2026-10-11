import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, MoneySchema, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

const ImageSchema = z.object({ url: z.string(), alt: z.string().catch('') })

/** A title as GET /titles lists it: enough for a card. */
const TitleCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .catch(null),
  cover: ImageSchema.nullable().catch(null),
  type: z.string().nullable().catch(null),
  ruleSystem: z.string().nullable().catch(null),
  formats: z.array(z.string()).catch([]),
  price: MoneySchema,
  listPrice: MoneySchema.nullable().catch(null),
  onSale: z.boolean().catch(false),
  rating: z
    .object({ average: z.number(), count: z.number().int() })
    .nullable()
    .catch(null),
  owned: z.boolean().catch(false),
  inWishlist: z.boolean().catch(false),
  textLanguage: z.string().catch(''),
})
export type TitleCard = z.infer<typeof TitleCardSchema>

const TitleListSchema = z.object({
  items: z.array(TitleCardSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})
type TitleList = z.infer<typeof TitleListSchema>

/**
 * The query parameters GET /titles and /titles/facets understand. Multi-select
 * values go comma-joined (`system=osr,d20_5e`), which the API reads as "any of".
 * `priceMax` is in minor units of the display currency.
 */
export type TitleFilters = {
  q?: string
  format?: string
  type?: string
  system?: string
  publisher?: string
  language?: string
  onSale?: boolean
  priceMax?: number
}
export type TitleSort = 'bestselling' | 'newest' | 'price_asc' | 'price_desc'

/** Leave out empty values: they are not filters, and they would split the cache. */
const compact = (filters: TitleFilters) =>
  Object.fromEntries(
    (Object.entries(filters) as Array<[string, unknown]>).filter(
      ([, value]) => value !== undefined && value !== '' && value !== false,
    ),
  ) as TitleFilters

/** GET /titles: one page of the catalogue for these filters. */
export function useTitles(
  filters: TitleFilters,
  {
    sort,
    page,
    pageSize,
  }: { sort?: TitleSort; page: number; pageSize: number },
) {
  const prefs = useRequestPrefs()
  const params = { ...compact(filters), sort, page, pageSize }
  return useQuery({
    queryKey: queryKeys.titles.list(params, prefs),
    queryFn: ({ signal }) =>
      apiFetch('/titles', { params, schema: TitleListSchema, prefs, signal }),
    // keep the current page on screen while the next filter's results load
    placeholderData: keepPreviousData,
  })
}

const FacetValueSchema = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number().int(),
})
const FacetsSchema = z.object({
  formats: z.array(FacetValueSchema).catch([]),
  types: z.array(FacetValueSchema).catch([]),
  ruleSystems: z.array(FacetValueSchema).catch([]),
  publishers: z.array(FacetValueSchema).catch([]),
})
export type TitleFacets = z.infer<typeof FacetsSchema>
export type FacetValue = z.infer<typeof FacetValueSchema>

/**
 * GET /titles/facets: the values each facet has, counted under `filters`. The
 * counts include the facet's own picks, so for a facet with picks ask again
 * without them (the listing does) to keep its siblings' counts.
 */
export function useTitleFacets(filters: TitleFilters, enabled = true) {
  const prefs = useRequestPrefs()
  const params = compact(filters)
  return useQuery({
    queryKey: queryKeys.titles.facets(params, prefs),
    queryFn: ({ signal }) =>
      apiFetch('/titles/facets', {
        params,
        schema: FacetsSchema,
        prefs,
        signal,
      }),
    placeholderData: keepPreviousData,
    enabled,
  })
}

const BannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().catch(''),
  cta: z.string(),
  link: z.string(),
  image: ImageSchema.nullable().catch(null),
})
export type Banner = z.infer<typeof BannerSchema>

/** GET /home, for its promotional banners (the listing shows the first). */
export function useHomeBanners() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.home(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/home', {
        schema: z.object({ hero: z.array(BannerSchema).catch([]) }).loose(),
        prefs,
        signal,
      }),
    select: (home) => home.hero,
  })
}

const EditionsSchema = z.object({
  editions: z.array(z.object({ sku: z.string() })).catch([]),
})

/**
 * Add a title from a card to the cart. Cards carry no SKU: take the first
 * edition's (the digital one the card's price is for) from GET /titles/{id},
 * then POST /cart/items.
 */
export function useAddTitleToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (titleId: string) => {
      const { editions } = await apiFetch(`/titles/${titleId}`, {
        schema: EditionsSchema,
      })
      if (editions.length === 0) throw new Error('no edition to buy')
      await apiFetch('/cart/items', {
        method: 'POST',
        body: { sku: editions[0].sku, qty: 1 },
        schema: z.unknown(),
      })
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['cart'] }),
  })
}

/**
 * Wishlist heart on a card: POST /wishlist/items or DELETE /wishlist/items/{titleId}.
 * Optimistic over every listed page; rolled back on failure.
 */
export function useToggleWishlist() {
  const queryClient = useQueryClient()
  const lists = { queryKey: ['titles', 'list'] }

  return useMutation({
    mutationFn: ({ titleId, on }: { titleId: string; on: boolean }) =>
      on
        ? apiFetch('/wishlist/items', {
            method: 'POST',
            body: { titleId },
            schema: z.unknown(),
          })
        : apiFetch(`/wishlist/items/${titleId}`, {
            method: 'DELETE',
            schema: z.unknown(),
          }),
    onMutate: async ({ titleId, on }) => {
      await queryClient.cancelQueries(lists)
      const previous = queryClient.getQueriesData<TitleList>(lists)
      queryClient.setQueriesData<TitleList>(
        lists,
        (list) =>
          list && {
            ...list,
            items: list.items.map((item) =>
              item.id === titleId ? { ...item, inWishlist: on } : item,
            ),
          },
      )
      return { previous }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.previous ?? [])
        queryClient.setQueryData(key, data)
    },
    onSettled: () => {
      // the header's wishlist count comes with /me
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
  })
}

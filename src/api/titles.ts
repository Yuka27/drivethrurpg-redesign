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
export const TitleCardSchema = z.object({
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
  genre?: string
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
  /** empty (and hidden everywhere) until the API has genre data */
  genres: z.array(FacetValueSchema).catch([]),
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

const HomeSectionSchema = z.object({
  /** "bestselling", "new", "sale", "free" */
  id: z.string(),
  title: z.string(),
  titles: z.array(TitleCardSchema).catch([]),
})
export type HomeSection = z.infer<typeof HomeSectionSchema>

/** GET /home: one schema for its one cache entry, read through the selectors below. */
const HomeSchema = z.object({
  hero: z.array(BannerSchema).catch([]),
  sections: z.array(HomeSectionSchema).catch([]),
})

function useHome<T>(select: (home: z.infer<typeof HomeSchema>) => T) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.home(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/home', { schema: HomeSchema, prefs, signal }),
    select,
  })
}

const banners = (home: z.infer<typeof HomeSchema>) => home.hero
const sections = (home: z.infer<typeof HomeSchema>) =>
  new Map(home.sections.map((section) => [section.id, section] as const))

/** The promotional banners (the home page and the listing show the first). */
export const useHomeBanners = () => useHome(banners)

/** The home page's title lists, by id. */
export const useHomeSections = () => useHome(sections)

const EditionSchema = z.object({
  sku: z.string(),
  format: z.string(),
  label: z.string(),
  price: MoneySchema,
  stock: z.string().catch('in_stock'),
  /** where a printed edition ships from; null for digital */
  shipsFrom: z.string().nullable().catch(null),
  includesPdf: z.boolean().catch(false),
})
export type Edition = z.infer<typeof EditionSchema>

const EditionsSchema = z.object({
  editions: z.array(z.object({ sku: z.string() })).catch([]),
})

/** GET /titles/{id}: everything the product page shows about the title. */
const TitleDetailSchema = TitleCardSchema.extend({
  description: z.string().catch(''),
  authors: z.array(z.object({ id: z.string(), name: z.string() })).catch([]),
  releaseDate: z.string().nullable().catch(null),
  pageCount: z.number().int().nullable().catch(null),
  fileSizeMb: z.number().nullable().catch(null),
  language: z.string().catch(''),
  isbn: z.string().nullable().catch(null),
  contentFlags: z
    .object({ aiGenerated: z.boolean().catch(false) })
    .catch({ aiGenerated: false }),
  editions: z.array(EditionSchema).catch([]),
  /** false: withdrawn from sale (the page still shows, nothing can be bought) */
  available: z.boolean().catch(true),
  availableLanguages: z.array(z.string()).catch([]),
})
export type TitleDetail = z.infer<typeof TitleDetailSchema>

export function useTitle(titleId: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.detail(titleId, prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${titleId}`, {
        schema: TitleDetailSchema,
        prefs,
        signal,
      }),
  })
}

const ReviewSchema = z.object({
  id: z.string(),
  author: z.object({ displayName: z.string() }),
  rating: z.number().int(),
  title: z.string().catch(''),
  body: z.string().catch(''),
  createdAt: z.string(),
  /** bought the title: Figma "Purchaser" */
  verifiedOwner: z.boolean().catch(false),
})
export type Review = z.infer<typeof ReviewSchema>

const ReviewsSchema = z.object({
  items: z.array(ReviewSchema),
  total: z.number().int(),
  /** how many reviews gave 1★ … 5★, in that order */
  histogram: z.array(z.number().int()).catch([]),
})

const DiscussionSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.object({ displayName: z.string() }),
  replyCount: z.number().int().catch(0),
  createdAt: z.string(),
  lastReplyAt: z.string().nullable().catch(null),
})
export type Discussion = z.infer<typeof DiscussionSchema>

const DiscussionsSchema = z.object({
  items: z.array(DiscussionSchema),
  total: z.number().int(),
})

/**
 * The whole of a title's reviews and discussion threads: the page merges them
 * into one list (Figma "Reviews & Discussions"), newest first, and pages it.
 */
const WHOLE = 100

export function useTitleReviews(titleId: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.related(titleId, 'reviews', prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${titleId}/reviews`, {
        params: { pageSize: WHOLE },
        schema: ReviewsSchema,
        prefs,
        signal,
      }),
  })
}

export function useTitleDiscussions(titleId: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.related(titleId, 'discussions', prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${titleId}/discussions`, {
        params: { pageSize: WHOLE },
        schema: DiscussionsSchema,
        prefs,
        signal,
      }),
  })
}

/** GET /titles/{id}/similar: Figma "Customers also bought". */
export function useSimilarTitles(titleId: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.related(titleId, 'similar', prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${titleId}/similar`, {
        schema: z.array(TitleCardSchema),
        prefs,
        signal,
      }),
  })
}

/** GET /titles/{id}/samples: preview pages, and a sample file to download. */
export function useTitleSamples(titleId: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.related(titleId, 'samples', prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${titleId}/samples`, {
        schema: z.object({
          previewPages: z.array(ImageSchema).catch([]),
          sampleFileUrl: z.string().nullable().catch(null),
        }),
        prefs,
        signal,
      }),
  })
}

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
    // the header's cart badge counts from GET /me
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
  })
}

/** POST /cart/items for one edition (the product page picks it). */
export function useAddEditionToCart() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sku, gift }: { sku: string; gift: boolean }) => {
      await apiFetch('/cart/items', {
        method: 'POST',
        body: { sku, qty: 1 },
        schema: z.unknown(),
      })
      // "Buy as a gift": the recipient is asked for at checkout
      if (gift)
        await apiFetch('/cart/gift', {
          method: 'PUT',
          body: { enabled: true },
          schema: z.unknown(),
        })
    },
    // the header's cart badge counts from GET /me
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['cart'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
  })
}

/** POST /wishlist/undo: puts back the title the last removal took off. */
export function useUndoWishlistRemove() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (undoToken: string) =>
      apiFetch('/wishlist/undo', {
        method: 'POST',
        body: { undoToken },
        schema: z.unknown(),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.titles.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
  })
}

/**
 * Wishlist heart: POST /wishlist/items or DELETE /wishlist/items/{titleId}.
 * Optimistic over every listed page and the title's own page; rolled back on
 * failure.
 */
export function useToggleWishlist() {
  const queryClient = useQueryClient()
  const lists = { queryKey: ['titles', 'list'] }
  const details = { queryKey: ['titles', 'detail'] }

  return useMutation({
    mutationFn: async ({ titleId, on }: { titleId: string; on: boolean }) => {
      if (on) {
        await apiFetch('/wishlist/items', {
          method: 'POST',
          body: { titleId },
          schema: z.unknown(),
        })
        return null
      }
      // removed: the token POST /wishlist/undo takes to put it back
      return apiFetch(`/wishlist/items/${titleId}`, {
        method: 'DELETE',
        schema: z
          .object({ undoToken: z.string().optional() })
          .nullable()
          .catch(null),
      })
    },
    onMutate: async ({ titleId, on }) => {
      await queryClient.cancelQueries(lists)
      await queryClient.cancelQueries(details)
      const previous = [
        ...queryClient.getQueriesData(lists),
        ...queryClient.getQueriesData(details),
      ]
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
      queryClient.setQueriesData<TitleDetail>(details, (title) =>
        title?.id === titleId ? { ...title, inWishlist: on } : title,
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

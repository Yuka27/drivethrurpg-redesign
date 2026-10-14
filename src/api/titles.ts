import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, MoneySchema, useRequestPrefs } from './client'
import {
  FollowRefSchema,
  FollowTargetSchema,
  lenientArray,
} from './follow-kind'
import { PublisherSchema } from './publishers'
import { queryKeys } from './query-keys'

const ImageSchema = z.object({ url: z.string(), alt: z.string().catch('') })

/** A title's sample PDF; null (or missing) when it has none. */
const SampleFileSchema = z
  .object({
    /** root-relative on the API's origin ("/files/sample.pdf"): through assetUrl */
    url: z.string(),
    pageCount: z.number().int().positive(),
    sizeMb: z.number().nonnegative(),
    format: z.string().catch('pdf'),
  })
  .nullable()
  .catch(null)
export type SampleFile = NonNullable<z.infer<typeof SampleFileSchema>>

/** A title as GET /titles lists it: enough for a card. */
export const TitleSummarySchema = z.object({
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
  /** the price is a suggestion: the buyer chooses */
  payWhatYouWant: z.boolean().catch(false),
})
export type TitleSummary = z.infer<typeof TitleSummarySchema>

export const TitleListSchema = z.object({
  items: z.array(TitleSummarySchema),
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
export const compact = (filters: TitleFilters) =>
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
    enabled = true,
  }: { sort?: TitleSort; page: number; pageSize: number; enabled?: boolean },
) {
  const prefs = useRequestPrefs()
  const params = { ...compact(filters), sort, page, pageSize }
  return useQuery({
    queryKey: queryKeys.titles.list(params, prefs),
    queryFn: ({ signal }) =>
      apiFetch('/titles', { params, schema: TitleListSchema, prefs, signal }),
    // keep the current page on screen while the next filter's results load
    placeholderData: keepPreviousData,
    enabled,
  })
}

/**
 * How many titles each of several searches finds (GET /titles, one title a
 * page: only `total` is read). The listing's "loosen one filter" counts.
 */
export function useTitleCounts(searches: Array<TitleFilters>) {
  const prefs = useRequestPrefs()
  return useQueries({
    queries: searches.map((filters) => {
      const params = { ...compact(filters), page: 1, pageSize: 1 }
      return {
        queryKey: queryKeys.titles.count(params, prefs),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          apiFetch('/titles', {
            params,
            schema: TitleListSchema,
            prefs,
            signal,
          }).then((list) => list.total),
      }
    }),
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
  /** the languages a title's text is available in */
  languages: z.array(FacetValueSchema).catch([]),
})
export type TitleFacets = z.infer<typeof FacetsSchema>

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

const TitleNameSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.object({ id: z.string(), name: z.string() }),
})

/**
 * GET /titles/{id}, only its name and publisher: for lines that carry neither
 * (order, cart and confirmation lines). Its own cache entry, kept an hour.
 */
export function useTitleName(id: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.name(id, prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${id}`, { schema: TitleNameSchema, prefs, signal }),
    staleTime: 60 * 60 * 1000,
  })
}

const ContentSideSchema = z.enum(['left', 'right'])
export type ContentSide = z.infer<typeof ContentSideSchema>

const BannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().catch(''),
  cta: z.string(),
  link: z.string(),
  /** a wide 2:1 image */
  image: ImageSchema.nullable().catch(null),
  /** where the copy, CTA and gradient go: the art's quiet side */
  contentSide: ContentSideSchema.catch('left'),
  /** how long this slide stays, when the carousel plays */
  autoplayMs: z.number().int().positive().nullable().catch(null),
})
export type Banner = z.infer<typeof BannerSchema>

const HeroOptionsSchema = z.object({
  autoplay: z.boolean().catch(false),
  intervalMs: z.number().int().positive().catch(6000),
  pauseOnHover: z.boolean().catch(true),
  contentSide: z.array(ContentSideSchema).catch([]),
})
export type HeroOptions = z.infer<typeof HeroOptionsSchema>

/** A campaign tile of "Discounts & Promos". */
const PromoSchema = z.object({
  id: z.string(),
  label: z.string().catch(''),
  discountLabel: z.string().catch(''),
  title: z.string(),
  subtitle: z.string().catch(''),
  art: ImageSchema.nullable().catch(null),
  link: z.string(),
  endsAt: z.string().nullable().catch(null),
})
export type Promo = z.infer<typeof PromoSchema>

const HomeSectionSchema = z.object({
  /** "bestselling", "new", "sale", "free" */
  id: z.string(),
  title: z.string(),
  titles: z.array(TitleSummarySchema).catch([]),
})
export type HomeSection = z.infer<typeof HomeSectionSchema>

/**
 * GET /home: one schema for its one cache entry, read through the selectors
 * below. Keys it does not name are dropped, and a broken part only empties
 * itself: never an error for the whole page.
 */
export const HomeSchema = z.object({
  hero: lenientArray(BannerSchema),
  /** null: a still hero, no autoplay */
  heroOptions: HeroOptionsSchema.nullable().catch(null),
  promos: lenientArray(PromoSchema),
  sections: lenientArray(HomeSectionSchema),
  /** "Browse by Publisher": only publishers with their own logo */
  publishers: lenientArray(PublisherSchema),
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
const hero = (home: z.infer<typeof HomeSchema>) => ({
  slides: home.hero,
  options: home.heroOptions,
})
const promos = (home: z.infer<typeof HomeSchema>) => home.promos
const publishers = (home: z.infer<typeof HomeSchema>) => home.publishers
const sections = (home: z.infer<typeof HomeSchema>) =>
  new Map(home.sections.map((section) => [section.id, section] as const))

/** The promotional banners (the home page and the listing show the first). */
export const useHomeBanners = () => useHome(banners)

/** The home carousel: its slides and how it plays. */
export const useHomeHero = () => useHome(hero)

/** "Discounts & Promos": the campaign tiles. */
export const useHomePromos = () => useHome(promos)

/** The home page's title lists, by id. */
export const useHomeSections = () => useHome(sections)

/** The home page's publisher strip, as the API picks it. */
export const useHomePublishers = () => useHome(publishers)

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
export const TitleDetailSchema = TitleSummarySchema.extend({
  /** a sentence or two for the header card (plain text); none: no lead there */
  shortDescription: z.string().trim().nullish().catch(null),
  /** the full text for Overview: plain paragraphs, blank lines between them */
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
  /** the product page's "Follow" card, in order: publisher, series, imprint, system, genres */
  followTargets: lenientArray(FollowTargetSchema),
  genreRefs: lenientArray(FollowRefSchema),
  /** the series (product line) it belongs to */
  productLineRef: FollowRefSchema.nullable().catch(null),
  /** the sample PDF ("Preview PDF") */
  sampleFile: SampleFileSchema,
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
  /** bought the title (the "Purchaser" badge) */
  verifiedOwner: z.boolean().catch(false),
  /** how many readers marked it helpful */
  helpfulCount: z.number().int().catch(0),
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
 * into one list, newest first, and pages it.
 */
const WHOLE = 100

/** The API's review orders: most helpful first (its default), or newest. */
export type ReviewSort = 'helpful' | 'newest'

export function useTitleReviews(titleId: string, sort: ReviewSort = 'newest') {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.reviews(titleId, sort, prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${titleId}/reviews`, {
        params: { pageSize: WHOLE, sort: sort === 'newest' ? sort : undefined },
        schema: ReviewsSchema,
        prefs,
        signal,
      }),
    // the other order stays on screen while this one loads
    placeholderData: keepPreviousData,
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

/** GET /titles/{id}/similar: "Customers also bought". */
export function useSimilarTitles(titleId: string) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.related(titleId, 'similar', prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${titleId}/similar`, {
        schema: z.array(TitleSummarySchema),
        prefs,
        signal,
      }),
  })
}

const PreviewEditionSchema = z.object({
  sku: z.string(),
  /** "pdf", "print_pdf" */
  format: z.string(),
  label: z.string(),
  price: MoneySchema,
  listPrice: MoneySchema.nullable().catch(null),
  onSale: z.boolean().catch(false),
  /** the one to preselect */
  default: z.boolean().catch(false),
  /** what the buyer gets ("Instant download", "Ships in 2–3 days") */
  note: z.string().catch(''),
  /** "in_stock", "low_stock" */
  stock: z.string().catch('in_stock'),
  /** "Only 3 left", shown when stock is low */
  stockNote: z.string().nullable().catch(null),
  shipsFrom: z.string().nullable().catch(null),
  includesPdf: z.boolean().catch(false),
})
export type PreviewEdition = z.infer<typeof PreviewEditionSchema>

/** GET /titles/{id}/preview: what the home panel shows of a title, in one request. */
export const TitlePreviewSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .catch(null),
  cover: ImageSchema.nullable().catch(null),
  type: z.string().nullable().catch(null),
  /** the system's display name ("Call of Cthulhu"), not its id */
  ruleSystemName: z.string().nullable().catch(null),
  /** display names */
  genres: z.array(z.string()).catch([]),
  rating: z
    .object({ average: z.number(), count: z.number().int() })
    .nullable()
    .catch(null),
  pageCount: z.number().int().nullable().catch(null),
  /** the language's name, in the request's language */
  languageLabel: z.string().nullable().catch(null),
  releaseDate: z.string().nullable().catch(null),
  humanCreated: z.boolean().catch(false),
  instantDownload: z.boolean().catch(false),
  shortDescription: z.string().trim().nullable().catch(null),
  available: z.boolean().catch(true),
  upcoming: z.boolean().catch(false),
  owned: z.boolean().catch(false),
  inWishlist: z.boolean().catch(false),
  editions: lenientArray(PreviewEditionSchema),
  /** at most the `pages` asked for */
  previewPages: lenientArray(ImageSchema),
  /** how many sample pages the title has in all */
  previewPageTotal: z.number().int().catch(0),
  sampleFileUrl: z.string().nullable().catch(null),
  sampleFile: SampleFileSchema,
})
export type TitlePreview = z.infer<typeof TitlePreviewSchema>

/** Sample pages the home panel asks for. */
export const PREVIEW_PAGES = 3

/**
 * GET /titles/{id}/preview?pages=3, cached per title; `enabled: false` waits
 * (the home list asks only once a row has been hovered or focused a moment).
 */
export function usePreview(titleId: string, enabled = true) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.titles.preview(titleId, PREVIEW_PAGES, prefs),
    queryFn: ({ signal }) =>
      apiFetch(`/titles/${titleId}/preview`, {
        params: { pages: PREVIEW_PAGES },
        schema: TitlePreviewSchema,
        prefs,
        signal,
      }),
    staleTime: 5 * 60 * 1000,
    enabled,
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
          /** the older field: prefer sampleFile */
          sampleFileUrl: z.string().nullable().catch(null),
          sampleFile: SampleFileSchema,
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
  const previews = { queryKey: ['titles', 'preview'] }

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
      await queryClient.cancelQueries(previews)
      const previous = [
        ...queryClient.getQueriesData(lists),
        ...queryClient.getQueriesData(details),
        ...queryClient.getQueriesData(previews),
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
      queryClient.setQueriesData<TitlePreview>(previews, (title) =>
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

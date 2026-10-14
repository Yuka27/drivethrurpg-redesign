import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

const LibraryFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: z.string().catch(''),
  sizeMb: z.number().catch(0),
  /** not downloaded since it was added or updated */
  isNew: z.boolean().catch(false),
})
export type LibraryFile = z.infer<typeof LibraryFileSchema>

const LibraryItemSchema = z.object({
  id: z.string(),
  title: z.object({ id: z.string(), name: z.string().catch('') }),
  publisher: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .catch(null),
  cover: z
    .object({ url: z.string(), alt: z.string().catch('') })
    .nullable()
    .catch(null),
  /** product type, rule system and formats: the filter facets' values */
  type: z.string().nullable().catch(null),
  ruleSystem: z.string().nullable().catch(null),
  genre: z.string().nullable().catch(null),
  formats: z.array(z.string()).catch([]),
  purchasedAt: z.string().catch(''),
  lastUpdatedAt: z.string().nullable().catch(null),
  giftFrom: z.object({ displayName: z.string() }).nullable().catch(null),
  hasUpdate: z.boolean().catch(false),
  files: z.array(LibraryFileSchema),
})
export type LibraryItem = z.infer<typeof LibraryItemSchema>

const LibrarySchema = z.object({ items: z.array(LibraryItemSchema) })

/** More than anyone's library holds in the mock; the API pages, the page filters. */
const WHOLE_LIBRARY = 100

/**
 * GET /library, all of it, under one cache entry: the library page filters,
 * sorts and pages it in the browser (the API filters one value per facet, the
 * design picks several), and the order page looks titles up in it.
 */
function useLibraryQuery<T>(
  select: (data: z.infer<typeof LibrarySchema>) => T,
  enabled = true,
) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.library({ all: true }, prefs),
    queryFn: ({ signal }) =>
      apiFetch('/library', {
        params: { pageSize: WHOLE_LIBRARY },
        schema: LibrarySchema,
        prefs,
        signal,
      }),
    select,
    enabled,
  })
}

const items = (data: z.infer<typeof LibrarySchema>) => data.items
const byTitle = (data: z.infer<typeof LibrarySchema>) =>
  new Map(data.items.map((item) => [item.title.id, item] as const))

export const useLibrary = (enabled = true) => useLibraryQuery(items, enabled)

/** What the user owns, keyed by title id (the order page's Download / In library). */
export const useLibraryByTitle = () => useLibraryQuery(byTitle)

/** GET /library/files/{fileId}/download: a short-lived download address. */
export function useFileDownload() {
  return useMutation({
    mutationFn: (fileId: string) =>
      apiFetch(`/library/files/${fileId}/download`, {
        schema: z.object({ url: z.string() }),
      }).then(({ url }) => url),
  })
}

const BundleJobSchema = z.object({
  status: z.enum(['pending', 'ready', 'failed']).catch('pending'),
  url: z.string().nullish(),
})
const BUNDLE_POLL_MS = 1000
const BUNDLE_MAX_POLLS = 30

/**
 * POST /library/download-bundle, then GET …/{jobId} until the zip is ready:
 * resolves with its address. For several titles, or a title with several files.
 */
export function useDownloadBundle() {
  return useMutation({
    mutationFn: async (itemIds: Array<string>) => {
      const { jobId } = await apiFetch('/library/download-bundle', {
        method: 'POST',
        body: { itemIds },
        schema: z.object({ jobId: z.string() }),
      })
      for (let poll = 0; poll < BUNDLE_MAX_POLLS; poll++) {
        const job = await apiFetch(`/library/download-bundle/${jobId}`, {
          schema: BundleJobSchema,
        })
        if (job.status === 'ready' && job.url) return job.url
        if (job.status === 'failed') break
        await new Promise((resolve) => setTimeout(resolve, BUNDLE_POLL_MS))
      }
      throw new Error('bundle not ready')
    },
  })
}

/** POST /library/{id}/mark-updates-seen: drops the "Updated" badge (optimistic). */
export function useMarkUpdatesSeen() {
  const queryClient = useQueryClient()
  const prefs = useRequestPrefs()
  const key = queryKeys.library({ all: true }, prefs)

  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch(`/library/${itemId}/mark-updates-seen`, {
        method: 'POST',
        body: {},
        schema: z.unknown(),
      }),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous =
        queryClient.getQueryData<z.infer<typeof LibrarySchema>>(key)
      queryClient.setQueryData<z.infer<typeof LibrarySchema>>(
        key,
        (data) =>
          data && {
            items: data.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    hasUpdate: false,
                    files: item.files.map((file) => ({
                      ...file,
                      isNew: false,
                    })),
                  }
                : item,
            ),
          },
      )
      return { previous }
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: ['library'] }),
  })
}

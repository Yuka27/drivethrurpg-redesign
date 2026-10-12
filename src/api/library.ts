import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

const LibraryFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** not downloaded since it was added or updated */
  isNew: z.boolean().catch(false),
})

const LibraryItemSchema = z.object({
  id: z.string(),
  title: z.object({ id: z.string() }),
  hasUpdate: z.boolean().catch(false),
  files: z.array(LibraryFileSchema),
})
export type LibraryItem = z.infer<typeof LibraryItemSchema>

/**
 * GET /library (all of it): what the user owns, keyed by title id, for the
 * order page's "Download" / "In library" buttons. Its own filters segment, so
 * the library page's paged list never shares this cache entry.
 */
export function useLibraryByTitle() {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.library({ all: true }, prefs),
    queryFn: ({ signal }) =>
      apiFetch('/library', {
        params: { pageSize: 100 },
        schema: z.object({ items: z.array(LibraryItemSchema) }),
        prefs,
        signal,
      }),
    select: ({ items }) =>
      new Map(items.map((item) => [item.title.id, item] as const)),
  })
}

/** GET /library/files/{fileId}/download: a short-lived download address. */
export function useFileDownload() {
  return useMutation({
    mutationFn: (fileId: string) =>
      apiFetch(`/library/files/${fileId}/download`, {
        schema: z.object({ url: z.string() }),
      }).then(({ url }) => url),
  })
}

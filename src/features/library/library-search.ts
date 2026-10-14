import { z } from 'zod'

import { createSearchMemory, listParam, searchText } from '@/lib/search-params'

export const LIBRARY_STATUSES = ['all', 'updated', 'gifts'] as const
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number]

export const LIBRARY_SORTS = ['added', 'updated', 'title', 'publisher'] as const
export type LibrarySort = (typeof LIBRARY_SORTS)[number]

/** The multi-select facets, in the sidebar's order. */
export const LIBRARY_FACETS = ['system', 'type', 'format', 'publisher'] as const
export type LibraryFacet = (typeof LIBRARY_FACETS)[number]

/** What the library opens on ("Sort: Recently added"). Defaults stay out of the URL. */
export const LIBRARY_SEARCH_DEFAULTS = {
  status: 'all' as LibraryStatus,
  system: '',
  type: '',
  format: '',
  publisher: '',
  q: '',
  sort: 'added' as LibrarySort,
  page: 1,
}

/**
 * /library?status=updated&system=osr,d20_5e&format=pdf&q=vault&sort=title&page=2.
 * Filters live in the URL (Back, reload and shared links keep them); anything
 * invalid falls back to its default.
 */
export const LibrarySearchSchema = z.object({
  status: z.enum(LIBRARY_STATUSES).default('all').catch('all'),
  system: listParam.default(''),
  type: listParam.default(''),
  format: listParam.default(''),
  publisher: listParam.default(''),
  q: searchText(z.string()).default('').catch(''),
  sort: z.enum(LIBRARY_SORTS).default('added').catch('added'),
  page: z.number().int().min(1).default(1).catch(1),
})
export type LibrarySearch = z.infer<typeof LibrarySearchSchema>

/** The view the user last looked at, for the header's "My Library" link. */
export const useLastLibrarySearch = createSearchMemory<LibrarySearch>(
  LIBRARY_SEARCH_DEFAULTS,
)

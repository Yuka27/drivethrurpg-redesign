import type {
  LibraryFacet,
  LibrarySearch,
  LibrarySort,
  LibraryStatus,
} from './library-search'
import { LIBRARY_FACETS } from './library-search'
import type { LibraryItem } from '@/api/library'
import type { FacetOption } from '@/components/filters/facet-option'
import { splitList } from '@/lib/search-params'

/** The facet values an item has (formats can be several). */
const valuesOf = (item: LibraryItem, facet: LibraryFacet): Array<string> => {
  switch (facet) {
    case 'system':
      return item.ruleSystem ? [item.ruleSystem] : []
    case 'type':
      return item.type ? [item.type] : []
    case 'format':
      return item.formats
    case 'publisher':
      return item.publisher ? [item.publisher.id] : []
  }
}

const hasStatus = (item: LibraryItem, status: LibraryStatus) =>
  status === 'all' ||
  (status === 'updated' && item.hasUpdate) ||
  (status === 'gifts' && item.giftFrom !== null)

const matchesQuery = (item: LibraryItem, q: string) => {
  const query = q.trim().toLocaleLowerCase()
  return (
    !query ||
    [
      item.title.name,
      item.publisher?.name ?? '',
      ...item.files.map((f) => f.name),
    ].some((text) => text.toLocaleLowerCase().includes(query))
  )
}

/**
 * Every filter except `skip`: within a facet the picked values are OR-ed, the
 * facets (and status, search) are AND-ed.
 */
function matches(
  item: LibraryItem,
  search: LibrarySearch,
  skip?: LibraryFacet | 'status',
) {
  if (skip !== 'status' && !hasStatus(item, search.status)) return false
  if (!matchesQuery(item, search.q)) return false
  return LIBRARY_FACETS.every((facet) => {
    if (facet === skip) return true
    const picked = splitList(search[facet])
    return (
      picked.length === 0 ||
      valuesOf(item, facet).some((value) => picked.includes(value))
    )
  })
}

export const filterLibrary = (
  items: Array<LibraryItem>,
  search: LibrarySearch,
) => items.filter((item) => matches(item, search))

const SORTS: Record<LibrarySort, (a: LibraryItem, b: LibraryItem) => number> = {
  added: (a, b) => b.purchasedAt.localeCompare(a.purchasedAt),
  updated: (a, b) =>
    (b.lastUpdatedAt ?? b.purchasedAt).localeCompare(
      a.lastUpdatedAt ?? a.purchasedAt,
    ),
  title: (a, b) => a.title.name.localeCompare(b.title.name),
  publisher: (a, b) =>
    (a.publisher?.name ?? '').localeCompare(b.publisher?.name ?? '') ||
    a.title.name.localeCompare(b.title.name),
}

export const sortLibrary = (items: Array<LibraryItem>, sort: LibrarySort) =>
  [...items].sort(SORTS[sort])

/**
 * A facet's options with live counts: how many items each value would show
 * given the other filters (the facet's own picks left out, so picking one value
 * does not zero the counts of its siblings). Values come from the whole library,
 * so an option never disappears while it is picked.
 */
export function facetOptions(
  items: Array<LibraryItem>,
  search: LibrarySearch,
  facet: LibraryFacet,
  label: (value: string, item: LibraryItem) => string,
): Array<FacetOption> {
  const options = new Map<string, FacetOption>()
  for (const item of items)
    for (const value of valuesOf(item, facet))
      if (!options.has(value))
        options.set(value, { value, label: label(value, item), count: 0 })

  for (const item of items)
    if (matches(item, search, facet))
      for (const value of new Set(valuesOf(item, facet)))
        options.get(value)!.count++

  // most common first, like the design; ties alphabetically
  return [...options.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  )
}

export function statusCounts(
  items: Array<LibraryItem>,
  search: LibrarySearch,
): Record<LibraryStatus, number> {
  const rest = items.filter((item) => matches(item, search, 'status'))
  return {
    all: rest.length,
    updated: rest.filter((item) => hasStatus(item, 'updated')).length,
    gifts: rest.filter((item) => hasStatus(item, 'gifts')).length,
  }
}

/** How many filters are on, for the mobile "Filters" badge. */
export const activeFilterCount = (search: LibrarySearch) =>
  (search.status === 'all' ? 0 : 1) +
  LIBRARY_FACETS.reduce(
    (sum, facet) => sum + splitList(search[facet]).length,
    0,
  )

import type { WishlistSearch, WishlistSort } from './wishlist-search'
import { isOnSale } from '@/api/wishlist'
import type { WishlistItem } from '@/api/wishlist'
import type { FacetOption } from '@/components/filters/facet-option'
import { LISTING_FACETS } from '@/features/listing/listing-search'
import type { ListingFacet } from '@/features/listing/listing-search'
import { splitList } from '@/lib/search-params'

/** The value an item has for a facet (none for genre: the wishlist has no genres). */
const valueOf = (item: WishlistItem, facet: ListingFacet) => {
  switch (facet) {
    case 'genre':
      return null
    case 'system':
      return item.ruleSystem
    case 'type':
      return item.type
    case 'format':
      return item.format
    case 'publisher':
      return item.publisher?.id ?? null
  }
}

/**
 * Every filter except the facet `skip`: within a facet the picked values are
 * OR-ed, everything else is AND-ed. The price filter is in whole units of the
 * display currency, the prices in its minor units.
 */
function matches(
  item: WishlistItem,
  search: WishlistSearch,
  skip?: ListingFacet,
) {
  if (search.onSale && !isOnSale(item)) return false
  if (
    search.priceMax !== undefined &&
    item.price.amount > Math.round(search.priceMax * 100)
  )
    return false
  return LISTING_FACETS.every((facet) => {
    if (facet === skip) return true
    const picked = splitList(search[facet])
    const value = valueOf(item, facet)
    return picked.length === 0 || (value !== null && picked.includes(value))
  })
}

const SORTS: Record<
  WishlistSort,
  (a: WishlistItem, b: WishlistItem) => number
> = {
  added: (a, b) => b.addedAt.localeCompare(a.addedAt),
  price_asc: (a, b) => a.price.amount - b.price.amount,
  price_desc: (a, b) => b.price.amount - a.price.amount,
  title: (a, b) => a.title.localeCompare(b.title),
}

/** The items the filters let through, in the chosen order. */
export const filterWishlist = (
  items: Array<WishlistItem>,
  search: WishlistSearch,
) => items.filter((item) => matches(item, search)).sort(SORTS[search.sort])

/**
 * A facet's values with live counts: each counted under every other filter but
 * not its own picks (so its siblings stay pickable), most titles first. A
 * picked value the other filters rule out stays listed, at 0.
 */
export function facetOptions(
  items: Array<WishlistItem>,
  search: WishlistSearch,
  facet: ListingFacet,
  label: (value: string, item: WishlistItem | undefined) => string,
): Array<FacetOption> {
  const counts = new Map<string, { count: number; item: WishlistItem }>()
  for (const item of items) {
    const value = valueOf(item, facet)
    if (value === null) continue
    const entry = counts.get(value) ?? { count: 0, item }
    if (matches(item, search, facet)) entry.count += 1
    counts.set(value, entry)
  }
  const options = [...counts]
    .filter(
      ([value, { count }]) =>
        count > 0 || splitList(search[facet]).includes(value),
    )
    .map(([value, { count, item }]) => ({
      value,
      label: label(value, item),
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
  for (const value of splitList(search[facet]))
    if (!options.some((option) => option.value === value))
      options.push({ value, label: label(value, undefined), count: 0 })
  return options
}

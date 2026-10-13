import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { ListingPage } from '@/features/listing/listing-page'
import {
  LISTING_SEARCH_DEFAULTS,
  ListingSearchSchema,
} from '@/features/listing/listing-search'
import type { ListingSearch } from '@/features/listing/listing-search'
import { useRecentSearches } from '@/stores/recent-searches'
import { replacesHistory } from '@/lib/search-params'

export const Route = createFileRoute('/_site/search')({
  // the listing's parameters, with the words: /search?q=vaesen&system=year_zero
  validateSearch: ListingSearchSchema,
  search: {
    middlewares: [
      stripSearchParams({ ...LISTING_SEARCH_DEFAULTS, q: undefined }),
    ],
  },
  component: SearchRoute,
})

/** /search?q=: the listing over what matches the words (GET /search). */
function SearchRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const addRecent = useRecentSearches((state) => state.add)

  return (
    <ListingPage
      mode="search"
      search={search}
      onSearchChange={(patch: Partial<ListingSearch>) =>
        void navigate({
          search: (previous) => ({ ...previous, ...patch }),
          replace: replacesHistory(patch),
        })
      }
      // a new search starts with no filters
      onSearch={(q) => {
        addRecent(q)
        void navigate({ search: { q } })
      }}
    />
  )
}

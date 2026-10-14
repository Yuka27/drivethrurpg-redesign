import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { ListingPage } from '@/features/listing/listing-page'
import {
  LISTING_SEARCH_DEFAULTS,
  ListingSearchSchema,
} from '@/features/listing/listing-search'
import type { ListingSearch } from '@/features/listing/listing-search'
import { replacesHistory } from '@/lib/search-params'

export const Route = createFileRoute('/_site/titles/')({
  validateSearch: ListingSearchSchema,
  // a plain /titles for the defaults: only changed filters show in the URL
  search: { middlewares: [stripSearchParams(LISTING_SEARCH_DEFAULTS)] },
  component: TitlesRoute,
})

function TitlesRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <ListingPage
      search={search}
      onSearchChange={(patch: Partial<ListingSearch>) =>
        void navigate({
          search: (previous) => ({ ...previous, ...patch }),
          replace: replacesHistory(patch),
        })
      }
    />
  )
}

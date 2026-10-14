import { createFileRoute, stripSearchParams } from '@tanstack/react-router'

import { WishlistPage } from '@/features/wishlist/wishlist-page'
import {
  WISHLIST_SEARCH_DEFAULTS,
  WishlistSearchSchema,
} from '@/features/wishlist/wishlist-search'
import type { WishlistSearch } from '@/features/wishlist/wishlist-search'
import { replacesHistory } from '@/lib/search-params'

export const Route = createFileRoute('/_auth/wishlist')({
  validateSearch: WishlistSearchSchema,
  // a plain /wishlist for the defaults: only changed filters show in the URL
  search: { middlewares: [stripSearchParams(WISHLIST_SEARCH_DEFAULTS)] },
  component: WishlistRoute,
})

function WishlistRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <WishlistPage
      search={search}
      onSearchChange={(patch: Partial<WishlistSearch>) =>
        void navigate({
          search: (previous) => ({ ...previous, ...patch }),
          replace: replacesHistory(patch),
        })
      }
    />
  )
}

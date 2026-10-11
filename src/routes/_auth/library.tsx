import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useEffect } from 'react'

import { LibraryPage } from '@/features/library/library-page'
import {
  LIBRARY_SEARCH_DEFAULTS,
  LibrarySearchSchema,
  useLastLibrarySearch,
} from '@/features/library/library-search'
import type { LibrarySearch } from '@/features/library/library-search'

export const Route = createFileRoute('/_auth/library')({
  validateSearch: LibrarySearchSchema,
  // a plain /library for the defaults: only changed filters show in the URL
  search: { middlewares: [stripSearchParams(LIBRARY_SEARCH_DEFAULTS)] },
  component: LibraryRoute,
})

function LibraryRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const remember = useLastLibrarySearch((state) => state.remember)

  useEffect(() => remember(search), [search, remember])

  return (
    <LibraryPage
      search={search}
      // replace, not push: each filter click or keystroke would otherwise be a
      // history entry for Back to step through
      onSearchChange={(patch: Partial<LibrarySearch>) =>
        void navigate({
          search: (previous) => ({ ...previous, ...patch }),
          replace: true,
        })
      }
    />
  )
}

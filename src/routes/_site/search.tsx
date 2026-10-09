import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { languageFilter, searchText } from '@/lib/search-params'

const SearchSearchSchema = z.object({
  q: searchText(z.string().trim().max(200).optional()).catch(undefined),
  language: languageFilter,
})

export const Route = createFileRoute('/_site/search')({
  validateSearch: SearchSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/search"!</div>
}

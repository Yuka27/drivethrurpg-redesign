import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { searchText } from '@/lib/search-params'

const ResetPasswordSearchSchema = z.object({
  token: searchText(z.string().min(1).optional()).catch(undefined),
})

export const Route = createFileRoute('/_site/reset-password')({
  validateSearch: ResetPasswordSearchSchema,
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/reset-password"!</div>
}

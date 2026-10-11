import { createFileRoute } from '@tanstack/react-router'

import { TitlePage } from '@/features/title/title-page'

export const Route = createFileRoute('/_site/titles/$titleId')({
  component: TitleRoute,
})

function TitleRoute() {
  const { titleId } = Route.useParams()
  // a new title starts fresh: tab, chosen edition, review page
  return <TitlePage key={titleId} titleId={titleId} />
}

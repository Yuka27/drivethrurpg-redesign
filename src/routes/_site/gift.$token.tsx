import { createFileRoute } from '@tanstack/react-router'

import { GiftClaimPage } from '@/features/gift/gift-claim-page'

export const Route = createFileRoute('/_site/gift/$token')({
  component: GiftRoute,
})

function GiftRoute() {
  const { token } = Route.useParams()
  // the link from the gift email: a new token starts fresh
  return <GiftClaimPage key={token} token={token} />
}

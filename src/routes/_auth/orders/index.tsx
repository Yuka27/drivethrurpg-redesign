import { createFileRoute, stripSearchParams } from '@tanstack/react-router'
import { useEffect } from 'react'

import { AccountShell } from '@/features/account/account-shell'
import { OrdersPage } from '@/features/account/orders-page'
import {
  ORDERS_SEARCH_DEFAULTS,
  OrdersSearchSchema,
  useLastOrdersSearch,
} from '@/features/account/orders-search'
import type { OrdersSearch } from '@/features/account/orders-search'

export const Route = createFileRoute('/_auth/orders/')({
  validateSearch: OrdersSearchSchema,
  // a plain /orders for the defaults: only changed filters show in the URL
  search: { middlewares: [stripSearchParams(ORDERS_SEARCH_DEFAULTS)] },
  component: OrdersRoute,
})

function OrdersRoute() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const remember = useLastOrdersSearch((state) => state.remember)

  useEffect(() => remember(search), [search, remember])

  return (
    <AccountShell>
      <OrdersPage
        search={search}
        // replace, not push: every keystroke or filter change would otherwise
        // be a history entry for Back to step through
        onSearchChange={(patch: Partial<OrdersSearch>) =>
          void navigate({
            search: (previous) => ({ ...previous, ...patch }),
            replace: true,
          })
        }
      />
    </AccountShell>
  )
}

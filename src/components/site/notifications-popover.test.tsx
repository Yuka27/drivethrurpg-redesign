import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { appLink, NotificationsPopover } from './notifications-popover'
import type { Notification } from '@/api/notifications'
import { TooltipProvider } from '@/components/ui/tooltip'
import { mockApi, user } from '@/test/api'
import type { Handler } from '@/test/api'
import { renderWithProviders } from '@/test/render'

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString()

const notifications: Array<Notification> = [
  {
    id: 'ntf_1',
    type: 'library',
    title: 'Exploring Eberron was updated',
    body: 'Version 1.3 fixes the index.',
    createdAt: daysAgo(1),
    read: false,
    link: '/library?view=updated',
  },
  {
    id: 'ntf_2',
    type: 'order',
    title: 'Your order DT-46550210 has shipped',
    body: 'Track it from your order page.',
    createdAt: daysAgo(10),
    read: true,
    link: '/orders/ord_DT-46550210',
  },
]

function mockNotifications(
  items: Array<Notification>,
  overrides: Record<string, Handler> = {},
) {
  return mockApi({
    'GET /me': { body: user },
    'GET /notifications': {
      body: { items, unreadCount: items.filter((item) => !item.read).length },
    },
    ...overrides,
  })
}

async function openPanel(unread = 1) {
  const result = await renderWithProviders(
    <TooltipProvider>
      <NotificationsPopover
        unread={unread}
        label="Notifications"
        countLabel={`Notifications, ${unread} unread`}
      />
    </TooltipProvider>,
  )
  await result.user.click(
    screen.getByRole('button', {
      name: unread > 0 ? `Notifications, ${unread} unread` : 'Notifications',
    }),
  )
  const panel = await screen.findByRole('dialog', { name: 'Notifications' })
  return { ...result, panel }
}

describe('NotificationsPopover', () => {
  it('lists the latest, marking the unread ones', async () => {
    mockNotifications(notifications)
    const { panel } = await openPanel()

    const rows = await within(panel).findAllByRole('link', {
      name: /updated|shipped/,
    })
    expect(rows[0]).toHaveTextContent(
      'Unread: Exploring Eberron was updated Version 1.3 fixes the index.Yesterday',
    )
    expect(rows[1]).not.toHaveTextContent('Unread')
    // the API's link, as the app's route
    expect(rows[0]).toHaveAttribute('href', '/library?status=updated')
    expect(
      within(panel).getByRole('link', { name: 'Notification settings' }),
    ).toHaveAttribute('href', '/account/preferences#email-notifications')
  })

  it('marks all as read', async () => {
    // the API marks them read: its next answer says so
    let items = notifications
    const { bodies } = mockNotifications(notifications, {
      'GET /notifications': () => ({ body: { items, unreadCount: 0 } }),
      'POST /notifications/read-all': () => {
        items = items.map((item) => ({ ...item, read: true }))
        return { status: 204 }
      },
    })
    const { user: u, panel } = await openPanel()

    await u.click(
      await within(panel).findByRole('button', { name: 'Mark all as read' }),
    )

    expect(bodies('POST /notifications/read-all')).toHaveLength(1)
    await waitFor(() => expect(within(panel).queryByText(/Unread/)).toBeNull())
    expect(
      within(panel).queryByRole('button', { name: 'Mark all as read' }),
    ).toBeNull()
  })

  it('opens a notification: read, closed, and on its page', async () => {
    const { bodies } = mockNotifications(notifications, {
      'POST /notifications/ntf_1/read': { status: 204 },
    })
    const { user: u, panel, router } = await openPanel()

    await u.click(
      await within(panel).findByRole('link', {
        name: /Exploring Eberron was updated/,
      }),
    )

    expect(bodies('POST /notifications/ntf_1/read')).toHaveLength(1)
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Notifications' }),
      ).toBeNull(),
    )
    expect(router.state.location.href).toBe('/library?status=updated')
  })

  it('says when there is nothing new', async () => {
    mockNotifications([])
    const { panel } = await openPanel(0)

    expect(
      await within(panel).findByRole('heading', {
        name: 'You’re all caught up',
      }),
    ).toBeVisible()
  })
})

describe('appLink', () => {
  it('keeps other links as they are', () => {
    expect(appLink('/titles/ttl_1')).toBe('/titles/ttl_1')
  })
})

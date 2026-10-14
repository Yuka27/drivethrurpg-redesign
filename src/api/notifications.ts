import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import { apiFetch, useRequestPrefs } from './client'
import { queryKeys } from './query-keys'

const NotificationSchema = z.object({
  id: z.string(),
  /** order, gift, publisher, library, wishlist… */
  type: z.string(),
  title: z.string(),
  body: z.string().catch(''),
  createdAt: z.string(),
  read: z.boolean(),
  /** where it leads, inside the app */
  link: z.string().nullish(),
})
export type Notification = z.infer<typeof NotificationSchema>

const NotificationsSchema = z.object({
  items: z.array(NotificationSchema),
  unreadCount: z.number().int().catch(0),
})
type Notifications = z.infer<typeof NotificationsSchema>

/** The latest few; the panel scrolls. */
const PAGE_SIZE = 20

/** GET /notifications, newest first (loaded when the panel opens). */
export function useNotifications(enabled = true) {
  const prefs = useRequestPrefs()
  return useQuery({
    queryKey: queryKeys.notifications(prefs),
    queryFn: ({ signal }) =>
      apiFetch('/notifications', {
        params: { pageSize: PAGE_SIZE },
        schema: NotificationsSchema,
        prefs,
        signal,
      }),
    enabled,
  })
}

/**
 * Marks some notifications read in the cached list straight away (rolled back
 * on failure); the header's unread badge comes with GET /me, refetched after.
 */
function useMarkRead<V>(
  request: (variables: V) => Promise<unknown>,
  isTarget: (notification: Notification, variables: V) => boolean,
) {
  const queryClient = useQueryClient()
  const key = { queryKey: ['notifications'] }
  return useMutation({
    mutationFn: request,
    onMutate: async (variables) => {
      await queryClient.cancelQueries(key)
      const previous = queryClient.getQueriesData<Notifications>(key)
      queryClient.setQueriesData<Notifications>(key, (data) => {
        if (!data) return data
        const items = data.items.map((item) =>
          isTarget(item, variables) ? { ...item, read: true } : item,
        )
        return {
          items,
          unreadCount: items.filter((item) => !item.read).length,
        }
      })
      return { previous }
    },
    onError: (_error, _variables, context) => {
      for (const [queryKey, data] of context?.previous ?? [])
        queryClient.setQueryData(queryKey, data)
    },
    onSettled: () => {
      void queryClient.invalidateQueries(key)
      void queryClient.invalidateQueries({ queryKey: queryKeys.me.all })
    },
  })
}

export const useMarkAllRead = () =>
  useMarkRead(
    () =>
      apiFetch('/notifications/read-all', {
        method: 'POST',
        body: {},
        schema: z.unknown(),
      }),
    () => true,
  )

/** POST /notifications/{id}/read: one, when it is opened. */
export const useMarkNotificationRead = () =>
  useMarkRead(
    (id: string) =>
      apiFetch(`/notifications/${id}/read`, {
        method: 'POST',
        body: {},
        schema: z.unknown(),
      }),
    (notification, id) => notification.id === id,
  )

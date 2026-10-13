import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { queryClient } from '@/lib/query-client'
import { routeTree } from '@/routeTree.gen'
import { useAuthDialogStore } from '@/stores/auth-dialog'
import { apiError, mockApi, user } from '@/test/api'

afterEach(() => {
  queryClient.clear()
  useAuthDialogStore.setState({ open: false, redirectTo: null })
})

/** The app's routes, opened at `path`, without rendering anything. */
async function open(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  return router
}

describe('the login-required pages', () => {
  it('send a guest home with the login modal, to come back once signed in', async () => {
    mockApi({ 'GET /me': apiError(401, 'unauthorized') })

    const router = await open('/library?status=updated')

    expect(router.state.location.pathname).toBe('/')
    const dialog = useAuthDialogStore.getState()
    expect(dialog.open).toBe(true)
    expect(dialog.view).toBe('login')
    expect(dialog.redirectTo).toBe('/library?status=updated')
  })

  it('open for an account', async () => {
    mockApi({ 'GET /me': { body: user } })

    const router = await open('/wishlist')

    expect(router.state.location.pathname).toBe('/wishlist')
    expect(useAuthDialogStore.getState().open).toBe(false)
  })
})

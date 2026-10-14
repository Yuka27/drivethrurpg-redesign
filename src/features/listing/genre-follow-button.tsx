import { CheckIcon, PlusIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useToggleFollow } from '@/api/following'
import { useGenres } from '@/api/genres'
import { useMe } from '@/api/me'
import { Button } from '@/components/ui/button'
import { useApiError } from '@/i18n/use-api-error'
import { cn } from '@/lib/utils'
import { useAuthDialogStore } from '@/stores/auth-dialog'

/**
 * "Follow Horror": a toggle for the one genre the listing is filtered by
 * (GET /genres for its name and state). Guests are asked to log in. Nothing
 * while the genres load or for a genre GET /genres does not list.
 */
export function GenreFollowButton({
  genre,
  className,
}: {
  genre: string
  className?: string
}) {
  const { t } = useTranslation('listing')
  const apiError = useApiError()
  const { data: me } = useMe()
  const openAuth = useAuthDialogStore((state) => state.openAuth)
  const genres = useGenres()
  const toggle = useToggleFollow()
  const target = genres.data?.find((item) => item.id === genre)
  if (!target) return null
  // a guest follows nothing, whatever the data says
  const following = Boolean(me) && target.following

  return (
    <Button
      type="button"
      variant={following ? 'secondary' : 'outline'}
      size="sm"
      // a toggle: the words stay, the state is "pressed" (and the check)
      aria-pressed={following}
      // until GET /me answers, a user is neither guest nor signed in
      disabled={me === undefined}
      onClick={(event) => {
        if (!me) {
          openAuth('login', { returnFocusTo: event.currentTarget })
          return
        }
        const on = !following
        toggle.mutate(
          { kind: 'genre', id: target.id, on },
          {
            onSuccess: () =>
              toast.success(
                t(on ? 'followGenre.followed' : 'followGenre.unfollowed', {
                  name: target.name,
                }),
              ),
            onError: (error) => toast.error(apiError(error)),
          },
        )
      }}
      className={cn('h-8 rounded-lg', following && 'border', className)}
    >
      {following ? <CheckIcon aria-hidden /> : <PlusIcon aria-hidden />}
      {t('followGenre.follow', { name: target.name })}
    </Button>
  )
}

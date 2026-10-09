import { assetUrl } from '@/api/client'
import type { Me } from '@/api/me'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

type UserAvatarProps = {
  user: Pick<Me, 'displayName' | 'avatar'>
  className?: string
}

/** Decorative: the name is always shown or announced next to it. */
export function UserAvatar({ user, className }: UserAvatarProps) {
  return (
    <Avatar className={cn('size-8', className)}>
      <AvatarImage src={assetUrl(user.avatar.url)} alt="" />
      <AvatarFallback aria-hidden className="text-xs font-medium">
        {initials(user.displayName)}
      </AvatarFallback>
    </Avatar>
  )
}

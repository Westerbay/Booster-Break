import { Avatar } from '@base-ui/react/avatar'
import { cn } from '@/lib/utils'

export function TrainerAvatar({
  name,
  avatarUrl,
  className,
}: {
  name: string
  avatarUrl?: string | null
  className?: string
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toLocaleUpperCase()
  return (
    <Avatar.Root
      className={cn(
        'trainer-avatar inline-flex size-12 shrink-0 items-center justify-center overflow-hidden',
        className,
      )}
      aria-hidden="true"
    >
      <Avatar.Image
        src={avatarUrl ?? undefined}
        alt=""
        referrerPolicy="no-referrer"
        className="size-full object-cover"
      />
      <Avatar.Fallback className="trainer-avatar-fallback">{initials || '?'}</Avatar.Fallback>
    </Avatar.Root>
  )
}

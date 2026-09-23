import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { Avatar } from '@base-ui/react/avatar'

interface TradeRecipientBadgeProps {
  owned: boolean | undefined
  recipientName: string
  recipientAvatarUrl?: string
  className?: string
}

export function TradeRecipientBadge({
  owned,
  recipientName,
  recipientAvatarUrl,
  className,
}: TradeRecipientBadgeProps) {
  if (owned === undefined) return null

  const label = owned ? m.trade_recipient_owned_short() : m.trade_recipient_new_short()
  const description = owned
    ? m.trade_recipient_owned_by({ name: recipientName })
    : m.trade_recipient_new({ name: recipientName })

  return (
    <span
      title={description}
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full pr-2.5 pl-0.5 text-[0.62rem] font-bold whitespace-nowrap shadow-md',
        owned
          ? 'bg-background/85 text-muted-foreground backdrop-blur-sm'
          : 'bg-primary text-primary-foreground',
        className,
      )}
    >
      <Avatar.Root
        className="inline-flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[0.55rem] font-black text-foreground"
        aria-hidden="true"
      >
        <Avatar.Image
          src={recipientAvatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
        <Avatar.Fallback>
          {Array.from(recipientName.trim())[0]?.toLocaleUpperCase() ?? '?'}
        </Avatar.Fallback>
      </Avatar.Root>
      <span className="min-w-0 truncate" aria-hidden="true">
        {label}
      </span>
      <span className="sr-only">{description}</span>
    </span>
  )
}

interface TradeRecipientDotProps {
  owned: boolean | undefined
  recipientName: string
  className?: string
}

export function TradeRecipientDot({ owned, recipientName, className }: TradeRecipientDotProps) {
  if (owned === undefined) return null

  const description = owned
    ? m.trade_recipient_owned_by({ name: recipientName })
    : m.trade_recipient_new({ name: recipientName })

  return (
    <span title={description} className={cn('inline-flex shrink-0 items-center', className)}>
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', owned ? 'bg-muted-foreground/50' : 'bg-primary')}
      />
      <span className="sr-only">{description}</span>
    </span>
  )
}

import { BookPlusIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

interface TradeRecipientBadgeProps {
  owned: boolean | undefined
  recipientName: string
}

export function TradeRecipientBadge({ owned, recipientName }: TradeRecipientBadgeProps) {
  if (owned === undefined) return null

  const Icon = owned ? CheckIcon : BookPlusIcon
  const label = owned ? m.trade_recipient_owned() : m.trade_recipient_new({ name: recipientName })
  const description = owned ? m.trade_recipient_owned_by({ name: recipientName }) : label

  return (
    <span
      title={description}
      aria-label={description}
      className={cn(
        'mt-2 inline-flex max-w-full items-start gap-1 rounded-md px-1.5 py-1 text-left text-[0.62rem] font-bold leading-tight',
        owned ? 'bg-muted text-muted-foreground' : 'bg-primary/15 text-primary',
      )}
    >
      <Icon className="mt-px size-3 shrink-0" aria-hidden="true" />
      <span className="min-w-0 wrap-anywhere">{label}</span>
    </span>
  )
}

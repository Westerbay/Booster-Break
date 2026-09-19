import { SwordsIcon } from 'lucide-react'
import type { PvpMatchView } from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useLocale } from '@/features/i18n/useLocale'
import { TrainerAvatar } from '@/features/trainers/components/TrainerAvatar'
import { m } from '@/paraglide/messages'
import { usePvpCommand } from '../hooks/usePvpCommand'

export function PvpInvitationModal({
  match,
  userId,
  onPrepare,
  onDismiss,
}: {
  match: PvpMatchView
  userId: string
  onPrepare: () => void
  onDismiss: () => void
}) {
  const { locale } = useLocale()
  const command = usePvpCommand(userId, onDismiss)
  const challenger = match.challenger
  function changeOpen(open: boolean) {
    if (!open && !command.isPending) onDismiss()
  }
  function decline() {
    command.mutate({ action: 'leave', matchId: match.id })
  }
  return (
    <Dialog open onOpenChange={changeOpen}>
      <DialogContent
        className="gap-6 p-5 sm:max-w-md sm:p-7"
        closeLabel={m.pvp_invitation_later()}
        showCloseButton={!command.isPending}
      >
        <div className="flex items-center gap-2 pr-10 text-xs font-semibold uppercase tracking-widest text-primary">
          <SwordsIcon className="size-4 shrink-0" aria-hidden="true" />
          {m.pvp_invitation_received()}
        </div>
        <div className="flex min-w-0 items-center gap-4">
          <TrainerAvatar
            name={challenger.name}
            avatarUrl={challenger.avatarUrl}
            className="size-16 shrink-0"
          />
          <div className="min-w-0">
            <DialogTitle className="text-2xl leading-tight [overflow-wrap:anywhere]">
              {m.pvp_invitation({ name: challenger.name })}
            </DialogTitle>
            <p className="mt-2 font-semibold tabular-nums text-primary">
              {challenger.elo.toLocaleString(locale)} Elo
            </p>
          </div>
        </div>
        <DialogDescription className="leading-relaxed">
          {m.pvp_invitation_prepare_hint()}
        </DialogDescription>
        {command.error && (
          <p role="alert" className="text-sm text-destructive">
            {command.error.message}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <Button
            variant="arena"
            className="sm:flex-1"
            onClick={onPrepare}
            disabled={command.isPending}
          >
            <SwordsIcon data-icon="inline-start" />
            {m.pvp_accept()}
          </Button>
          <Button
            variant="arena-outline"
            className="sm:flex-1"
            onClick={decline}
            disabled={command.isPending}
          >
            {command.isPending ? m.pvp_sending() : m.pvp_decline()}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

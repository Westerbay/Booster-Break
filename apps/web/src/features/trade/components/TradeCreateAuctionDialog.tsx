import type { AuthMeResponse, SupportedLocale } from '@tcg-collection/shared'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { m } from '@/paraglide/messages'
import { TradeCreateAuctionPanel } from './TradeCreateAuctionPanel'

interface TradeCreateAuctionDialogProps {
  open: boolean
  locale: SupportedLocale
  auth: AuthMeResponse
  activeAuctions: number
  onClose: () => void
  onAuctionCreated: () => void
}

export function TradeCreateAuctionDialog({
  open,
  locale,
  auth,
  activeAuctions,
  onClose,
  onAuctionCreated,
}: TradeCreateAuctionDialogProps) {
  function openChanged(nextOpen: boolean) {
    if (!nextOpen) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={openChanged}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] min-w-0 max-w-4xl overflow-y-auto sm:max-w-4xl"
        closeLabel={m.pvp_close()}
      >
        <DialogTitle className="pr-12">{m.trade_create_auction()}</DialogTitle>
        <TradeCreateAuctionPanel
          key={`trade-create-${locale}`}
          auth={auth}
          activeAuctions={activeAuctions}
          onAuctionCreated={onAuctionCreated}
        />
      </DialogContent>
    </Dialog>
  )
}

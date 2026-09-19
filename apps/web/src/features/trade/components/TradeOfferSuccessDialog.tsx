import { CheckCircle2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { m } from '@/paraglide/messages'

interface TradeOfferSuccessDialogProps {
  open: boolean
  onClose: () => void
}

export function TradeOfferSuccessDialog({ open, onClose }: TradeOfferSuccessDialogProps) {
  function openChanged(nextOpen: boolean) {
    if (!nextOpen) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={openChanged}>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        closeLabel={m.pvp_close()}
      >
        <div className="flex items-start gap-3 pr-10">
          <CheckCircle2Icon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <DialogTitle>{m.trade_offer_success_title()}</DialogTitle>
            <DialogDescription className="mt-2">
              {m.trade_offer_success_message()}
            </DialogDescription>
          </div>
        </div>
        <div className="flex justify-end">
          <DialogClose render={<Button type="button" />}>{m.trade_offer_success_ok()}</DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}

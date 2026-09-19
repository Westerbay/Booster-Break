import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  isBusy?: boolean
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isBusy = false,
}: ConfirmationDialogProps) {
  function openChanged(nextOpen: boolean) {
    if (!nextOpen && !isBusy) onCancel()
  }

  return (
    <Dialog open={open} onOpenChange={openChanged} disablePointerDismissal={isBusy}>
      <DialogContent
        role="alertdialog"
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose render={<Button type="button" variant="outline" />} disabled={isBusy}>
            {cancelLabel}
          </DialogClose>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isBusy}>
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
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
      <DialogContent role="alertdialog" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose
            render={<Button type="button" variant="outline" size="lg" />}
            disabled={isBusy}
          >
            {cancelLabel}
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            size="lg"
            onClick={onConfirm}
            disabled={isBusy}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

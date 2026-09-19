import { useRef, useState, type ReactNode } from 'react'
import { ExpandIcon } from 'lucide-react'
import type { PokemonCardSummary } from '@tcg-collection/shared'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { CardImageDialog } from './CardImageDialog'

interface CardPreviewProps {
  card: PokemonCardSummary
  children: ReactNode
  className?: string
}

/** A card inspection action, independent from choosing a card or challenging its trainer. */
export function CardPreview({ card, children, className }: CardPreviewProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  function show() {
    setOpen(true)
  }
  function close() {
    setOpen(false)
  }
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cn('card-preview-trigger', className)}
        aria-label={m.card_preview_open({ name: card.name })}
        aria-haspopup="dialog"
        onClick={show}
      >
        {children}
        <span className="card-preview-indicator" aria-hidden="true">
          <ExpandIcon />
        </span>
      </button>
      {open && <CardImageDialog card={card} onClose={close} finalFocus={triggerRef} />}
    </>
  )
}

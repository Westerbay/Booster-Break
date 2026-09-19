import { useState, type MouseEvent, type RefObject, type SyntheticEvent } from 'react'
import { ImageOffIcon, LoaderCircleIcon } from 'lucide-react'
import type { PokemonCardSummary } from '@tcg-collection/shared'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { m } from '@/paraglide/messages'
import { resolveCardPreviewFinish } from '../lib/card-format'
import { WebGlCardViewer } from './WebGlCardViewer'

interface CardImageDialogProps {
  card: PokemonCardSummary
  onClose: () => void
  finalFocus?: RefObject<HTMLButtonElement | null>
}

export function CardImageDialog({ card, onClose, finalFocus }: CardImageDialogProps) {
  const [attempt, setAttempt] = useState(0)
  const [readySource, setReadySource] = useState<string>()
  const sources = [
    ...new Set(
      [card.imageLarge, card.imageSmall].flatMap((source) => {
        if (!source) return []
        return [source, source.replace('://assets.tcgdex.net/fr/', '://assets.tcgdex.net/en/')]
      }),
    ),
  ]
  const imageUrl = sources[attempt]
  const loading = Boolean(imageUrl && readySource !== imageUrl)
  const finish = resolveCardPreviewFinish(card)
  function openChanged(open: boolean) {
    if (!open) onClose()
  }
  function closeBackground(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }
  function imageFailed(event: SyntheticEvent<HTMLDivElement>) {
    const image = event.target
    if (image instanceof HTMLImageElement && image.getAttribute('aria-hidden') !== 'true') {
      setAttempt(attempt + 1)
    }
  }
  function imageReady() {
    setReadySource(imageUrl)
  }

  return (
    <Dialog open onOpenChange={openChanged}>
      <DialogContent
        className="card-preview-dialog"
        overlayClassName="bg-[var(--game-card-scrim)] supports-backdrop-filter:backdrop-blur-sm"
        closeLabel={m.pvp_close()}
        finalFocus={finalFocus}
        onClick={closeBackground}
      >
        <DialogTitle className="sr-only">{card.name}</DialogTitle>
        <DialogDescription className="sr-only">{m.card_preview_hint()}</DialogDescription>
        <div className="card-preview-artwork" onErrorCapture={imageFailed} aria-busy={loading}>
          {imageUrl ? (
            <WebGlCardViewer
              key={`${imageUrl}-${finish ?? 'normal'}`}
              frontImageUrl={imageUrl}
              alt={card.name}
              cardId={card.id}
              finish={finish}
              rarity={card.rarity}
              supertype={card.supertype}
              isEvolved={card.isEvolved}
              onReady={imageReady}
            />
          ) : (
            <div className="card-preview-unavailable" role="img" aria-label={card.name}>
              <ImageOffIcon aria-hidden="true" />
              <span>{m.pvp_unknown_card()}</span>
            </div>
          )}
          {loading && (
            <div className="card-preview-loading" role="status">
              <LoaderCircleIcon aria-hidden="true" />
              <span>{m.trade_loading_cards()}</span>
            </div>
          )}
        </div>
        {imageUrl && <p className="card-preview-hint">{m.card_preview_hint()}</p>}
      </DialogContent>
    </Dialog>
  )
}

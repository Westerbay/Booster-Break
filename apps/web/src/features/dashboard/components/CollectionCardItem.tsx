import { memo } from 'react'
import type { ReactNode } from 'react'
import { CheckIcon, PlusIcon } from 'lucide-react'
import type { PokemonCardSummary } from '@tcg-collection/shared'

import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { Button } from '@/components/ui/button'
import { CardPreview } from './CardPreview'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { formatCardFinish } from '../lib/card-format'
import { FoilCardImage } from './FoilCardImage'

interface CollectionCardItemProps {
  card: PokemonCardSummary & { quantity?: number }
  setName?: string
  selected?: boolean
  disabled?: boolean
  selectionLabel?: string
  onSelect?: () => void
  onImageClick?: () => void
  badge?: ReactNode
  className?: string
  children?: ReactNode
  artwork?: ReactNode
  previewable?: boolean
}

export const CollectionCardItem = memo(function CollectionCardItem({
  card,
  setName,
  selected = false,
  disabled = false,
  selectionLabel,
  onSelect,
  onImageClick,
  badge,
  className,
  children,
  artwork,
  previewable = false,
}: CollectionCardItemProps) {
  const meta = [
    card.rarity ? formatRarity(card.rarity) : card.number,
    formatCardFinish(card.finish),
  ].filter(Boolean)

  const cardArtwork =
    artwork ??
    (card.imageSmall ? (
      <FoilCardImage
        src={card.imageSmall}
        alt={card.name}
        cardId={card.id}
        finish={card.finish}
        rarity={card.rarity}
        supertype={card.supertype}
        isEvolved={card.isEvolved}
        className="aspect-63/88 w-full rounded-md object-cover"
        containerClassName="transition-transform hover:-translate-y-0.5"
      />
    ) : (
      <div className="aspect-63/88 w-full rounded-md bg-muted" aria-hidden="true" />
    ))
  const separateSelection = onSelect && (previewable || onImageClick)
  let image = cardArtwork
  if (previewable) {
    image = <CardPreview card={card}>{cardArtwork}</CardPreview>
  } else if (onImageClick) {
    image = (
      <button
        type="button"
        className="card-preview-trigger"
        onClick={onImageClick}
        aria-label={m.card_preview_open({ name: card.name })}
        aria-haspopup="dialog"
      >
        {cardArtwork}
      </button>
    )
  }

  const content = (
    <article className="relative">
      <div className="relative">
        {image}
        {badge ? (
          <span className="absolute right-1 top-1 rounded-full bg-sidebar px-1.5 py-0.5 text-[0.62rem] font-black text-sidebar-foreground">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[0.66rem] font-black">{card.name}</p>
          <p className="truncate text-[0.62rem] font-semibold text-muted-foreground">
            {meta.length > 0 ? meta.join(' · ') : null}
          </p>
          {setName ? (
            <p className="truncate text-[0.58rem] font-semibold text-muted-foreground">{setName}</p>
          ) : null}
        </div>
        {card.quantity !== undefined && (
          <span className="rounded-md bg-sidebar px-1.5 py-0.5 text-[0.62rem] font-black text-sidebar-foreground">
            {card.quantity}x
          </span>
        )}
      </div>
      {children}
    </article>
  )

  if (onSelect && !separateSelection) {
    return (
      <button
        type="button"
        className={cn(
          'w-28 cursor-pointer rounded-lg border border-border bg-background p-2 text-left disabled:cursor-not-allowed disabled:opacity-40',
          'enabled:hover:border-primary enabled:hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring',
          selected ? 'border-primary ring-2 ring-primary' : null,
          className,
        )}
        disabled={disabled}
        aria-pressed={selectionLabel ? selected : undefined}
        aria-label={selectionLabel}
        onClick={onSelect}
      >
        {content}
      </button>
    )
  }

  return (
    <article
      className={cn(
        'w-28 rounded-lg border border-border bg-background p-2',
        separateSelection && 'collection-card-choice',
        selected ? 'border-primary ring-2 ring-primary' : null,
        className,
      )}
    >
      {content}
      {separateSelection && (
        <Button
          variant={selected ? 'secondary' : 'outline'}
          size="sm"
          className="collection-card-select"
          disabled={disabled}
          onClick={onSelect}
          aria-pressed={selected}
          aria-label={selectionLabel}
        >
          {selected ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <PlusIcon data-icon="inline-start" />
          )}
          {selected ? m.card_remove() : m.card_choose()}
        </Button>
      )}
    </article>
  )
})

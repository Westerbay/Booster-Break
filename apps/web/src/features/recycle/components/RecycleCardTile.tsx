import { memo } from 'react'
import { ArrowLeftRightIcon, MinusIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react'
import type { UserCollectionCard } from '@tcg-collection/shared'

import { cn } from '@/lib/utils'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { recyclableQuantity, recycleKey } from '../lib/recycle-utils'
import { m } from '@/paraglide/messages'

interface RecycleCardTileProps {
  card: UserCollectionCard
  setName?: string
  selected: number
  onChange: (key: string, quantity: number) => void
}

export const RecycleCardTile = memo(function RecycleCardTile({
  card,
  setName,
  selected,
  onChange,
}: RecycleCardTileProps) {
  const reserved = card.reservedQuantity
  const recyclable = recyclableQuantity(card)
  const inTrade = reserved > 0
  const isSelected = selected > 0
  const key = recycleKey(card)
  const willEmpty = isSelected && selected >= card.quantity
  const canIncrement = selected < recyclable
  const canDecrement = selected > 0

  return (
    <article
      title={
        willEmpty
          ? m.recycle_last_copy_hint()
          : inTrade
            ? m.recycle_in_trade_hint({ count: reserved })
            : undefined
      }
      className={cn(
        'w-full rounded-lg border border-border bg-background p-2 text-left transition-colors',
        isSelected ? 'border-sidebar ring-2 ring-sidebar' : null,
        willEmpty ? 'border-destructive ring-2 ring-destructive' : null,
      )}
    >
      <button
        type="button"
        onClick={() => onChange(key, isSelected ? 0 : Math.max(1, recyclable - 1))}
        disabled={recyclable === 0}
        aria-pressed={isSelected}
        aria-label={m.recycle_tile_toggle({ name: card.name })}
        className="relative block w-full cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
      >
        {card.imageSmall ? (
          <FoilCardImage
            src={card.imageSmall}
            alt={card.name}
            cardId={card.id}
            finish={card.finish}
            rarity={card.rarity}
            supertype={card.supertype}
            isEvolved={card.isEvolved}
            className={cn(
              'aspect-63/88 w-full rounded-md object-cover transition-opacity',
              isSelected ? 'opacity-60' : null,
            )}
          />
        ) : (
          <div className="aspect-63/88 w-full rounded-md bg-muted" aria-hidden="true" />
        )}
        <span className="absolute right-1 top-1 rounded-full bg-sidebar px-1.5 py-0.5 text-[0.62rem] font-black text-sidebar-foreground">
          {card.quantity}x
        </span>
        {isSelected ? (
          <span className="absolute left-1 top-1 rounded-full bg-destructive px-1.5 py-0.5 text-[0.62rem] font-black text-white">
            -{selected}
          </span>
        ) : null}
        {inTrade ? (
          <span className="absolute bottom-1 left-1 flex items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[0.62rem] font-black text-white">
            <ArrowLeftRightIcon className="size-2.5 shrink-0" aria-hidden="true" />
            {reserved}
          </span>
        ) : null}
      </button>

      <div className="mt-1.5 min-w-0">
        <p className="truncate text-[0.66rem] font-black">{card.name}</p>
        {willEmpty ? (
          <p className="flex items-center gap-1 truncate text-[0.62rem] font-black text-destructive">
            <TriangleAlertIcon className="size-3 shrink-0" aria-hidden="true" />
            {m.recycle_last_copy()}
          </p>
        ) : inTrade ? (
          <p className="flex items-center gap-1 truncate text-[0.62rem] font-black text-amber-600">
            <ArrowLeftRightIcon className="size-3 shrink-0" aria-hidden="true" />
            {m.recycle_in_trade()}
          </p>
        ) : (
          <p className="truncate text-[0.62rem] font-semibold text-muted-foreground">
            {[card.rarity ? formatRarity(card.rarity) : card.number, formatCardFinish(card.finish)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        )}
        {setName ? (
          <p className="truncate text-[0.58rem] font-semibold text-muted-foreground">{setName}</p>
        ) : null}
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-1">
        <button
          type="button"
          aria-label={m.recycle_remove_one()}
          disabled={!canDecrement}
          className="flex size-6 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors enabled:cursor-pointer enabled:hover:border-sidebar disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onChange(key, Math.max(0, selected - 1))}
        >
          <MinusIcon className="size-3.5" aria-hidden="true" />
        </button>
        <span className="text-[0.72rem] font-black tabular-nums">{selected}</span>
        <button
          type="button"
          aria-label={m.recycle_add_one()}
          disabled={!canIncrement}
          className="flex size-6 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors enabled:cursor-pointer enabled:hover:border-sidebar disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onChange(key, Math.min(recyclable, selected + 1))}
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </article>
  )
})

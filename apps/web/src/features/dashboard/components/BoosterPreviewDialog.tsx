import { useMemo, useState } from 'react'
import { SparklesIcon } from 'lucide-react'
import type { PokemonCardSummary, PokemonSetSummary } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { getNewCardChance, getRarityChanceLabel, groupCardsByRarity } from '../lib/pack-rarity'
import { m } from '@/paraglide/messages'
import { CardImageDialog } from './CardImageDialog'

interface BoosterPreviewDialogProps {
  cards: PokemonCardSummary[]
  isPending: boolean
  onClose: () => void
  set: PokemonSetSummary
  showRarityChanceLabels?: boolean
  ownedCardIds?: ReadonlySet<string>
}

export function BoosterPreviewDialog({
  cards,
  isPending,
  onClose,
  set,
  showRarityChanceLabels = true,
  ownedCardIds,
}: BoosterPreviewDialogProps) {
  const [selectedPreviewCard, setSelectedPreviewCard] = useState<PokemonCardSummary>()
  const [highlightOwned, setHighlightOwned] = useState(false)
  const previewCardsByRarity = useMemo(() => groupCardsByRarity(cards, set.id), [cards, set.id])
  const canHighlightOwned = Boolean(ownedCardIds) && cards.length > 0
  const ownedCount = useMemo(
    () => (ownedCardIds ? cards.filter((card) => ownedCardIds.has(card.id)).length : 0),
    [cards, ownedCardIds],
  )
  const newCardChance = useMemo(
    () => (ownedCardIds ? getNewCardChance(cards, ownedCardIds, set.id) : 0),
    [cards, ownedCardIds, set.id],
  )
  const ownedSummary =
    cards.length === 1
      ? m.packs_owned_summary_one({ owned: ownedCount, total: cards.length })
      : m.packs_owned_summary({ owned: ownedCount, total: cards.length })

  function getOwnedDescription() {
    if (!highlightOwned || !canHighlightOwned) return m.packs_sorted_by_rarity()
    if (ownedCount === cards.length) return ownedSummary

    return `${ownedSummary} · ${m.packs_new_card_chance({ chance: newCardChance.toFixed(1) })}`
  }
  function closePreview() {
    setSelectedPreviewCard(undefined)
    onClose()
  }
  function openChanged(open: boolean) {
    if (!open) closePreview()
  }

  return (
    <Dialog open onOpenChange={openChanged}>
      <DialogContent
        className="max-h-[min(92dvh,54rem)] sm:max-w-[58rem] md:p-5"
        closeLabel={m.packs_close_preview()}
      >
        <div className="mb-4 flex flex-col gap-3 pr-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <DialogTitle className="text-lg font-black">
              {m.packs_preview_title({ set: set.name })}
            </DialogTitle>
            <DialogDescription className="text-sm font-semibold text-muted-foreground">
              {getOwnedDescription()}
            </DialogDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canHighlightOwned ? (
              <Button
                type="button"
                variant={highlightOwned ? 'default' : 'outline'}
                size="sm"
                onClick={() => setHighlightOwned((value) => !value)}
                aria-pressed={highlightOwned}
              >
                <SparklesIcon className="size-4" aria-hidden="true" />
                {highlightOwned ? m.packs_owned_highlight_on() : m.packs_owned_highlight_off()}
              </Button>
            ) : null}
          </div>
        </div>

        {isPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-44 rounded-lg bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5">
            {previewCardsByRarity.map(([rarity, rarityCards]) => (
              <section key={rarity} className="grid gap-2">
                <h4 className="text-sm font-black">
                  {formatRarity(rarity)}
                  {showRarityChanceLabels ? (
                    <span className="ml-2 text-xs font-black text-muted-foreground">
                      {getRarityChanceLabel(rarity, cards, set.id)}
                    </span>
                  ) : null}
                  {highlightOwned && canHighlightOwned ? (
                    <span className="ml-2 text-xs font-black text-muted-foreground">
                      {rarityCards.length === 1
                        ? m.packs_owned_summary_one({
                            owned: rarityCards.filter((card) => ownedCardIds?.has(card.id)).length,
                            total: rarityCards.length,
                          })
                        : m.packs_owned_summary({
                            owned: rarityCards.filter((card) => ownedCardIds?.has(card.id)).length,
                            total: rarityCards.length,
                          })}
                    </span>
                  ) : null}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {rarityCards.map((card) => {
                    const isOwned = ownedCardIds?.has(card.id) ?? false
                    const isDimmed = highlightOwned && canHighlightOwned && !isOwned

                    return (
                      <button
                        key={card.id}
                        type="button"
                        className="group relative w-20 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => setSelectedPreviewCard(card)}
                        aria-label={m.packs_view_card_aria({ name: card.name })}
                      >
                        {card.imageSmall ? (
                          <img
                            src={card.imageSmall}
                            alt={card.name}
                            className={cn(
                              'aspect-63/88 w-full rounded-md object-cover shadow-sm transition-all group-hover:-translate-y-0.5',
                              isDimmed && 'opacity-35 grayscale',
                            )}
                          />
                        ) : (
                          <div
                            className={cn(
                              'aspect-63/88 rounded-md bg-muted',
                              isDimmed && 'opacity-35',
                            )}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
        {selectedPreviewCard ? (
          <CardImageDialog
            card={selectedPreviewCard}
            onClose={() => setSelectedPreviewCard(undefined)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

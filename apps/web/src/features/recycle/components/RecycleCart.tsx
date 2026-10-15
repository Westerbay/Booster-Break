import { memo, useMemo } from 'react'
import { RecycleIcon, Wand2Icon, XIcon } from 'lucide-react'
import { RECYCLE_COST } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

import {
  getSelectedQuantity,
  recycleKey,
  selectedInGroup,
  type RecycleRarityGroup,
  type RecycleSelection,
} from '../lib/recycle-utils'

interface RecycleCartProps {
  groups: RecycleRarityGroup[]
  selection: RecycleSelection
  selectedCount: number
  rewardCount: number
  autoSurplus: number
  isBusy: boolean
  onChange: (key: string, quantity: number) => void
  onAuto: () => void
  onClear: () => void
  onRecycle: () => void
}

export const RecycleCart = memo(function RecycleCart({
  groups,
  selection,
  selectedCount,
  rewardCount,
  autoSurplus,
  isBusy,
  onChange,
  onAuto,
  onClear,
  onRecycle,
}: RecycleCartProps) {
  const queued = useMemo(
    () =>
      groups
        .map((group) => {
          const selected = selectedInGroup(selection, group)

          return {
            group,
            selected,
            rewards: Math.floor(selected / RECYCLE_COST),
            cards: group.cards.filter((card) => getSelectedQuantity(selection, card) > 0),
          }
        })
        .filter((entry) => entry.cards.length > 0),
    [groups, selection],
  )

  return (
    <aside className="flex max-h-[70dvh] flex-col rounded-lg border bg-card p-4 lg:sticky lg:top-4 lg:max-h-[min(100%,calc(100dvh-2rem))]">
      <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
        {m.recycle_cart_title()}
      </h3>

      <div className="mt-3 rounded-lg border bg-background p-3">
        <p className="text-2xl font-black tabular-nums leading-none">
          {m.recycle_selected_summary({ selected: selectedCount })}
        </p>
        <p
          className={cn(
            'mt-1 text-sm font-black',
            rewardCount > 0 ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {m.recycle_crafts_summary({ count: rewardCount })}
        </p>
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {queued.length === 0 ? (
          <p className="rounded-lg border bg-background p-4 text-sm font-semibold text-muted-foreground">
            {m.recycle_cart_empty()}
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {queued.map(({ group, selected, rewards, cards }) => (
              <div key={group.rarityRank} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-black">{formatRarity(group.rarity)}</span>
                  <span className="text-[0.7rem] font-bold tabular-nums text-muted-foreground">
                    {rewards > 0 ? m.recycle_group_yield({ count: rewards }) : null}{' '}
                    {m.recycle_progress_to_next({
                      current: selected % RECYCLE_COST,
                      cost: RECYCLE_COST,
                    })}
                  </span>
                </div>

                {cards.map((card) => (
                  <div
                    key={recycleKey(card)}
                    className="flex items-center gap-2 rounded-md bg-background px-2 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-bold" title={card.name}>
                      {card.name}
                    </span>
                    <span className="text-xs font-black tabular-nums">
                      ×{getSelectedQuantity(selection, card)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={m.recycle_cart_remove({ name: card.name })}
                      onClick={() => onChange(recycleKey(card), 0)}
                    >
                      <XIcon aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={isBusy || autoSurplus === 0}
            onClick={onAuto}
          >
            <Wand2Icon aria-hidden="true" />
            {m.recycle_auto({ count: autoSurplus })}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={isBusy || selectedCount === 0}
            onClick={onClear}
          >
            {m.recycle_clear()}
          </Button>
        </div>
        <Button
          type="button"
          size="lg"
          className="h-11"
          disabled={isBusy || rewardCount === 0}
          onClick={onRecycle}
        >
          <RecycleIcon aria-hidden="true" />
          {isBusy ? m.recycle_action_pending() : m.recycle_action({ count: rewardCount })}
        </Button>
      </div>
    </aside>
  )
})

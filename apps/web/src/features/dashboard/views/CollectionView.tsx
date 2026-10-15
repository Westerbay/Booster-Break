import { useState } from 'react'
import { ArrowLeftIcon, RecycleIcon } from 'lucide-react'
import { RECYCLE_COST } from '@tcg-collection/shared'

import { CollectionPanel } from '../components/CollectionPanel'
import { RecycleAnimationOverlay } from '../../recycle/components/RecycleAnimationOverlay'
import { RecycleCardTile } from '../../recycle/components/RecycleCardTile'
import { RecycleCart } from '../../recycle/components/RecycleCart'
import { useRecycleCart } from '../../recycle/hooks/useRecycleCart'
import { getSelectedQuantity, recycleKey } from '../../recycle/lib/recycle-utils'
import { useLocale } from '@/features/i18n/useLocale'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import { useBrowseCollection } from '../hooks/useBrowseCollection'

export function CollectionView() {
  useLocale()
  const [isRecycling, setIsRecycling] = useState(false)
  const browse = useBrowseCollection(isRecycling ? 'owned' : undefined)
  const engine = useRecycleCart(isRecycling)

  const panel = (
    <CollectionPanel
      cards={browse.cards}
      isPending={browse.isPending}
      page={browse.page}
      pageCount={browse.pageCount}
      total={browse.total}
      totalCards={browse.totalCards}
      sort={browse.sort}
      searchQuery={browse.searchQuery}
      sets={browse.sets}
      selectedSetId={browse.selectedSetId}
      onSortChange={browse.onSortChange}
      onSearchChange={browse.onSearchChange}
      onSetChange={browse.onSetChange}
      minimumQuantity={browse.minimumQuantity}
      minimumRarity={browse.minimumRarity}
      rarityOptions={browse.rarityOptions}
      onMinimumQuantityChange={browse.onMinimumQuantityChange}
      onMinimumRarityChange={browse.onMinimumRarityChange}
      onPageChange={browse.onPageChange}
      title={isRecycling ? m.recycle_title() : undefined}
      subtitle={isRecycling ? m.recycle_description({ cost: RECYCLE_COST }) : undefined}
      headerAction={
        <Button
          type="button"
          variant={isRecycling ? 'outline' : 'default'}
          size="lg"
          onClick={() => setIsRecycling((current) => !current)}
        >
          {isRecycling ? (
            <>
              <ArrowLeftIcon aria-hidden="true" />
              {m.collection_action_stop_recycle()}
            </>
          ) : (
            <>
              <RecycleIcon aria-hidden="true" />
              {m.collection_action_recycle()}
            </>
          )}
        </Button>
      }
      renderCard={
        isRecycling
          ? (card, setName) => (
              <RecycleCardTile
                key={recycleKey(card)}
                card={card}
                setName={setName}
                selected={getSelectedQuantity(engine.selection, card)}
                onChange={engine.updateSelection}
              />
            )
          : undefined
      }
    />
  )

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {isRecycling ? (
        <div className="mx-auto grid w-full max-w-[93rem] gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="flex min-w-0 justify-center">{panel}</div>
          <div className="relative min-w-0">
            <div className="lg:absolute lg:inset-0">
              <RecycleCart
                groups={engine.groups}
                selection={engine.selection}
                selectedCount={engine.selectedCount}
                rewardCount={engine.rewardCount}
                autoSurplus={engine.autoSurplus}
                isBusy={engine.isBusy}
                onChange={engine.updateSelection}
                onAuto={engine.handleAuto}
                onClear={engine.clearSelection}
                onRecycle={engine.handleRecycle}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full justify-center">{panel}</div>
      )}

      {engine.animation ? (
        <RecycleAnimationOverlay
          batches={engine.animation.batches}
          rewards={engine.animation.rewards}
          setNameById={engine.setNameById}
          onClose={engine.closeAnimation}
        />
      ) : null}
    </div>
  )
}

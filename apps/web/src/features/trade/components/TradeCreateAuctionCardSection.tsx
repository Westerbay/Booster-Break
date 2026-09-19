import { m } from '@/paraglide/messages'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { TradeCollectionCardItem } from './TradeCollectionCardItem'
import { TradeSortPreferenceMenu } from './TradeSortPreferenceMenu'
import { CardListFiltersMenu } from '@/features/dashboard/components/CardListFiltersMenu'
import { offerCardKey } from '../lib/trade-utils'
import type { CollectionSort, UserCollectionCard } from '@tcg-collection/shared'

interface TradeCreateAuctionCardSectionProps {
  preference: CollectionSort
  searchQuery: string
  onSearchChange: (query: string) => void
  preferenceOptions: readonly { value: CollectionSort; label: string }[]
  onPreferenceChange: (preference: CollectionSort) => void
  minimumQuantity: number
  minimumRarity?: string
  rarityOptions: readonly string[]
  onMinimumQuantityChange: (quantity: number) => void
  onMinimumRarityChange: (rarity: string | undefined) => void
  filteredCards: UserCollectionCard[]
  isLoading: boolean
  collectionHasCards: boolean
  collectionPage: number
  collectionPageCount: number
  onPrevPage: () => void
  onNextPage: () => void
  selectedCard?: UserCollectionCard
  selectedKey: string
  selectedSummary: string | null
  onSelectCard: (card: UserCollectionCard) => void
}

export function TradeCreateAuctionCardSection({
  preference,
  searchQuery,
  onSearchChange,
  preferenceOptions,
  onPreferenceChange,
  minimumQuantity,
  minimumRarity,
  rarityOptions,
  onMinimumQuantityChange,
  onMinimumRarityChange,
  filteredCards,
  isLoading,
  collectionHasCards,
  collectionPage,
  collectionPageCount,
  onPrevPage,
  onNextPage,
  selectedCard,
  selectedKey,
  selectedSummary,
  onSelectCard,
}: TradeCreateAuctionCardSectionProps) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
          {m.trade_card_selection_step()}
        </p>
        <div className="flex min-w-0 w-full flex-col gap-2 text-xs text-muted-foreground sm:w-auto sm:flex-row sm:items-center">
          <CardListFiltersMenu
            minimumQuantity={minimumQuantity}
            minimumRarity={minimumRarity}
            rarityOptions={rarityOptions}
            onMinimumQuantityChange={onMinimumQuantityChange}
            onMinimumRarityChange={onMinimumRarityChange}
          />
          <label className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center">
            {m.trade_card_preference_label()}
            <TradeSortPreferenceMenu
              value={preference}
              options={preferenceOptions}
              onValueChange={onPreferenceChange}
              className="w-full sm:w-auto sm:min-w-32"
            />
          </label>
        </div>
      </div>

      <label className="mt-2 flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:items-center">
        <span className="text-xs font-black uppercase tracking-wide text-muted-foreground sm:shrink-0">
          {m.trade_search_by_pokemon_label()}
        </span>
        <input
          value={searchQuery}
          onChange={(event) => {
            onSearchChange(event.target.value)
          }}
          className="h-9 w-full flex-1 min-w-0 rounded-md border bg-background px-2 text-sm placeholder:text-xs max-sm:min-h-11 sm:w-auto"
          placeholder={m.trade_search_by_pokemon_placeholder()}
          aria-label={m.trade_search_by_pokemon_aria()}
        />
      </label>

      <div className="mt-2 grid min-h-[14rem] min-w-0 grid-cols-2 content-start justify-center gap-3 sm:flex sm:flex-wrap">
        {filteredCards.length === 0 ? (
          isLoading ? (
            <p className="col-span-full rounded-md bg-background p-3 text-sm text-muted-foreground">
              {m.trade_loading_cards()}
            </p>
          ) : (
            <p className="col-span-full rounded-md bg-background p-3 text-sm text-muted-foreground">
              {searchQuery.length > 0
                ? m.trade_search_no_match()
                : m.trade_no_cards_in_collection()}
            </p>
          )
        ) : (
          filteredCards.map((card) => {
            const key = offerCardKey(card.id, card.finish)
            const isSelected = selectedKey === key

            return (
              <TradeCollectionCardItem
                key={key}
                card={card}
                onSelect={() => {
                  onSelectCard(card)
                }}
                selected={isSelected}
                className="min-w-0 transition enabled:hover:border-primary enabled:hover:bg-primary/5 max-sm:w-full"
                badge={isSelected ? m.trade_used() : null}
              />
            )
          })
        )}
      </div>

      {collectionHasCards ? (
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground max-sm:flex-wrap max-sm:gap-2">
          <button
            type="button"
            className="cursor-pointer rounded-md border px-2 py-1 max-sm:min-h-11 max-sm:min-w-11"
            disabled={collectionPage <= 1 || isLoading}
            onClick={onPrevPage}
          >
            {m.packs_previous()}
          </button>
          <span className="whitespace-nowrap">
            {collectionPage} / {collectionPageCount}
          </span>
          <button
            type="button"
            className="cursor-pointer rounded-md border px-2 py-1 max-sm:min-h-11 max-sm:min-w-11"
            disabled={collectionPage >= collectionPageCount || isLoading}
            onClick={onNextPage}
          >
            {m.packs_next()}
          </button>
        </div>
      ) : null}

      <p className="mt-2 break-words text-sm font-semibold text-muted-foreground">
        {selectedSummary
          ? `${m.trade_selected_card_label()}: ${selectedSummary}`
          : m.trade_pick_one_card()}
      </p>

      {selectedCard ? (
        <div className="mt-2 flex justify-center">
          <div className="min-w-0 w-full max-w-md">
            <div className="rounded-lg border bg-background p-2">
              <FoilCardImage
                src={selectedCard.imageLarge ?? selectedCard.imageSmall ?? ''}
                alt={selectedCard.name}
                cardId={selectedCard.id}
                finish={selectedCard.finish}
                rarity={selectedCard.rarity}
                supertype={selectedCard.supertype}
                isEvolved={selectedCard.isEvolved}
                className="w-full rounded-md"
              />
              <p className="mt-1 break-words text-center text-sm font-black">
                {selectedSummary ?? selectedCard.name}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

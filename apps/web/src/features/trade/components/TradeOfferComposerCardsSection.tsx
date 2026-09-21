import { m } from '@/paraglide/messages'
import type { CollectionSort, UserCollectionCard } from '@tcg-collection/shared'
import { BookPlusIcon, MinusIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { CardImageDialog } from '@/features/dashboard/components/CardImageDialog'
import { TradeCollectionCardItem } from './TradeCollectionCardItem'
import { TradeSortPreferenceMenu } from './TradeSortPreferenceMenu'
import { CardListFiltersMenu } from '@/features/dashboard/components/CardListFiltersMenu'
import { MAX_PENDING_OFFERS_PER_AUCTION_BY_USER, offerCardKey } from '../lib/trade-utils'
import { TradeRecipientBadge } from './TradeRecipientBadge'

interface TradeOfferComposerCardsSectionProps {
  collectionPage: number
  collectionPageCount: number
  isLoading: boolean
  preference: CollectionSort
  onPreferenceChange: (preference: CollectionSort) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  minimumQuantity: number
  minimumRarity?: string
  rarityOptions: readonly string[]
  onMinimumQuantityChange: (quantity: number) => void
  onMinimumRarityChange: (rarity: string | undefined) => void
  tradePreferenceOptions: readonly { value: CollectionSort; label: string }[]
  filteredCards: UserCollectionCard[]
  selectedCardsCount: number
  selectedCardsTotal: number
  activeOfferCount: number
  remainingOffers: number
  onPrevPage: () => void
  onNextPage: () => void
  getCardQuantity: (card: UserCollectionCard) => number
  updateSelection: (card: UserCollectionCard, rawValue: string) => void
  recipientName: string
  recipientAvatarUrl?: string
  recipientOwnershipByCard: ReadonlyMap<string, boolean>
  onlyNewForRecipient: boolean
  onOnlyNewForRecipientChange: (value: boolean) => void
}

export function TradeOfferComposerCardsSection({
  collectionPage,
  collectionPageCount,
  isLoading,
  preference,
  onPreferenceChange,
  searchQuery,
  onSearchChange,
  minimumQuantity,
  minimumRarity,
  rarityOptions,
  onMinimumQuantityChange,
  onMinimumRarityChange,
  tradePreferenceOptions,
  filteredCards,
  selectedCardsCount,
  selectedCardsTotal,
  activeOfferCount,
  remainingOffers,
  onPrevPage,
  onNextPage,
  getCardQuantity,
  updateSelection,
  recipientName,
  recipientAvatarUrl,
  recipientOwnershipByCard,
  onlyNewForRecipient,
  onOnlyNewForRecipientChange,
}: TradeOfferComposerCardsSectionProps) {
  const [selectedPreviewCard, setSelectedPreviewCard] = useState<UserCollectionCard | null>(null)

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-9 min-w-40 flex-1 items-center gap-2 rounded-md border bg-background px-2.5 transition-colors focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/15 max-sm:h-11 max-sm:basis-full">
          <SearchIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(event) => {
              onSearchChange(event.target.value)
            }}
            className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-xs focus:outline-none"
            placeholder={m.trade_search_by_pokemon_label()}
            aria-label={m.trade_search_by_pokemon_aria()}
          />
        </div>
        <Button
          type="button"
          variant={onlyNewForRecipient ? 'default' : 'outline'}
          className="h-9"
          title={m.trade_filter_only_new_for_recipient({ name: recipientName })}
          aria-label={m.trade_filter_only_new_for_recipient({ name: recipientName })}
          aria-pressed={onlyNewForRecipient}
          onClick={() => {
            onOnlyNewForRecipientChange(!onlyNewForRecipient)
          }}
        >
          <BookPlusIcon className="size-4" aria-hidden="true" />
          {m.trade_filter_only_new()}
        </Button>
        <CardListFiltersMenu
          minimumQuantity={minimumQuantity}
          minimumRarity={minimumRarity}
          rarityOptions={rarityOptions}
          onMinimumQuantityChange={onMinimumQuantityChange}
          onMinimumRarityChange={onMinimumRarityChange}
        />
        <TradeSortPreferenceMenu
          value={preference}
          options={tradePreferenceOptions}
          onValueChange={onPreferenceChange}
        />
      </div>

      <div className="rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">
        <p>
          {selectedCardsCount === 1
            ? m.trade_offer_selected_one({ count: selectedCardsCount })
            : m.trade_offer_selected_many({ count: selectedCardsCount })}
          {' · '}
          {m.trade_offer_total({ count: selectedCardsTotal })}
          {' · '}
          {m.trade_offer_quota({
            used: activeOfferCount,
            max: MAX_PENDING_OFFERS_PER_AUCTION_BY_USER,
            remaining: remainingOffers,
          })}
        </p>
      </div>

      <div className="flex min-h-[14rem] min-w-0 flex-wrap content-start justify-center gap-3">
        {filteredCards.length === 0 ? (
          <p className="rounded-md bg-background p-3 text-sm text-muted-foreground">
            {isLoading && searchQuery.length === 0
              ? m.trade_loading_cards_for_offer()
              : m.trade_search_no_match()}
          </p>
        ) : (
          filteredCards.map((card) => {
            const selectedQuantity = getCardQuantity(card)
            const key = offerCardKey(card.id, card.finish)
            const hasSelection = selectedQuantity > 0

            return (
              <TradeCollectionCardItem
                key={key}
                card={card}
                className={`w-36 sm:w-40 rounded-lg ${
                  hasSelection ? 'border-orange-500/90 ring-2 ring-orange-500/80' : ''
                }`}
                onImageClick={() => {
                  setSelectedPreviewCard(card)
                }}
              >
                <TradeRecipientBadge
                  owned={recipientOwnershipByCard.get(card.id)}
                  recipientName={recipientName}
                  recipientAvatarUrl={recipientAvatarUrl}
                  className="absolute top-1.5 left-1.5 z-10"
                />
                <label className="mt-2 block text-xs text-muted-foreground">
                  {m.trade_offer_quantity()}
                </label>
                <div className="mt-1 grid grid-cols-2 items-center justify-items-center gap-1 sm:flex sm:justify-center sm:gap-2">
                  <button
                    type="button"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-black transition hover:bg-sidebar/10 hover:text-sidebar-foreground disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-11 max-sm:min-w-11"
                    disabled={selectedQuantity <= 0}
                    onClick={() => updateSelection(card, String(selectedQuantity - 1))}
                    aria-label={m.trade_offer_remove_card()}
                  >
                    <MinusIcon className="size-4" aria-hidden="true" />
                  </button>
                  <span className="min-w-6 text-center text-sm font-black tabular-nums max-sm:order-first max-sm:col-span-2">
                    {selectedQuantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-background text-xs font-black transition hover:bg-sidebar/10 hover:text-sidebar-foreground disabled:cursor-not-allowed disabled:opacity-50 max-sm:min-h-11 max-sm:min-w-11"
                    disabled={selectedQuantity >= card.quantity}
                    onClick={() => updateSelection(card, String(selectedQuantity + 1))}
                    aria-label={m.trade_offer_add_card()}
                  >
                    <PlusIcon className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </TradeCollectionCardItem>
            )
          })
        )}
      </div>

      {selectedPreviewCard ? (
        <CardImageDialog
          card={{
            ...selectedPreviewCard,
            finish: selectedPreviewCard.finish ?? 'normal',
          }}
          onClose={() => {
            setSelectedPreviewCard(null)
          }}
        />
      ) : null}

      <div className="flex items-center justify-between text-xs text-muted-foreground max-sm:flex-wrap max-sm:gap-2">
        <button
          type="button"
          className="cursor-pointer rounded-md border px-3 py-2 max-sm:min-h-11 max-sm:min-w-11"
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
          className="cursor-pointer rounded-md border px-3 py-2 max-sm:min-h-11 max-sm:min-w-11"
          disabled={collectionPage >= collectionPageCount || isLoading}
          onClick={onNextPage}
        >
          {m.packs_next()}
        </button>
      </div>
    </>
  )
}

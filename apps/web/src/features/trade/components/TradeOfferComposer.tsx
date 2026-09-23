import { type FormEvent } from 'react'
import type { CollectionSort, TradeAuctionResponse } from '@tcg-collection/shared'
import { m } from '@/paraglide/messages'
import { toast } from '@/features/toast/toast-store'
import { useTradeOfferComposer } from '../hooks/useTradeOfferComposer'
import { TradeOfferComposerCardsSection } from './TradeOfferComposerCardsSection'
import { TradeOfferComposerPreviewSection } from './TradeOfferComposerPreviewSection'
import { TradeRecipientDot } from './TradeRecipientBadge'

interface TradeOfferComposerProps {
  auction: TradeAuctionResponse
  userId?: string
  onOfferCreated: () => void
}

export function TradeOfferComposer({ auction, userId, onOfferCreated }: TradeOfferComposerProps) {
  const {
    canOffer,
    canOfferReason,
    offerLimitReached,
    activeOfferCount,
    remainingOffers,
    page,
    setPage,
    preference,
    setPreference,
    searchQuery,
    setSearchQuery,
    minimumQuantity,
    setMinimumQuantity,
    minimumRarity,
    setMinimumRarity,
    onlyNewForRecipient,
    setOnlyNewForRecipient,
    collectionRarityOptions,
    collectionPage,
    collectionPageCount,
    isCollectionPending,
    filteredCards,
    selectedEntries,
    selectedCardsCount,
    selectedCardsTotal,
    selectedCardQuantity,
    handleSubmit,
    clearSelection,
    updateSelection,
    isSubmitting,
    recipientOwnershipByCard,
    isRecipientOwnershipLoading,
    recipientOwnershipError,
    retryRecipientOwnership,
  } = useTradeOfferComposer({
    auction,
    userId,
    onOfferCreated,
  })
  const recipientName = auction.creatorDisplayName ?? auction.creatorPseudo

  const tradePreferenceOptions: readonly { value: CollectionSort; label: string }[] = [
    { value: 'quantity', label: m.sort_quantity() },
    { value: 'rarity', label: m.sort_rarity() },
    { value: 'name', label: m.sort_name() },
    { value: 'recent', label: m.sort_recent() },
  ]

  const handlePreferenceChange = (next: CollectionSort) => {
    setPage(1)
    setPreference(next)
  }

  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleMinimumQuantityChange = (quantity: number) => {
    setMinimumQuantity(quantity)
    setPage(1)
  }

  const handleMinimumRarityChange = (rarity: string | undefined) => {
    setMinimumRarity(rarity)
    setPage(1)
  }

  const handleOnlyNewForRecipientChange = (value: boolean) => {
    setOnlyNewForRecipient(value)
    setPage(1)
  }

  if (!userId) {
    return (
      <p className="text-sm font-semibold text-muted-foreground">
        {m.trade_connect_to_send_offers()}
      </p>
    )
  }

  if (!canOffer) {
    if (offerLimitReached || canOfferReason === 'offer_limit_reached') {
      return (
        <p className="text-sm font-semibold text-muted-foreground">
          {m.trade_offer_limit_reached()}
        </p>
      )
    }

    return (
      <p className="text-sm font-semibold text-muted-foreground">{m.trade_cannot_make_offer()}</p>
    )
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (selectedCardsCount === 0) {
      toast.show(m.trade_add_card_before_send_offer())
      return
    }

    handleSubmit(event)
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <h3 className="text-sm font-black uppercase tracking-wide text-muted-foreground">
        {m.trade_offer_cards_title()}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
        <span className="font-bold text-foreground">
          {m.trade_recipient_legend({ name: recipientName })}
        </span>
        {[false, true].map((owned) => (
          <span key={String(owned)} className="inline-flex items-center gap-1.5">
            <span aria-hidden="true">
              <TradeRecipientDot owned={owned} recipientName={recipientName} />
            </span>
            <span className="sr-only">
              {owned ? m.trade_recipient_owned_short() : m.trade_recipient_new_short()} :
            </span>
            {owned ? m.trade_recipient_legend_owned() : m.trade_recipient_legend_new()}
          </span>
        ))}
      </div>
      {isRecipientOwnershipLoading && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {m.trade_recipient_loading()}
        </p>
      )}
      {recipientOwnershipError && (
        <div
          className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          role="status"
        >
          <span>{recipientOwnershipError}</span>
          <button
            type="button"
            className="min-h-11 underline underline-offset-4"
            onClick={retryRecipientOwnership}
          >
            {m.trade_recipient_retry()}
          </button>
        </div>
      )}

      <form className="mt-3 space-y-4" onSubmit={onSubmit}>
        <TradeOfferComposerCardsSection
          collectionPage={collectionPage}
          collectionPageCount={collectionPageCount}
          isLoading={isCollectionPending || (onlyNewForRecipient && isRecipientOwnershipLoading)}
          preference={preference}
          onPreferenceChange={handlePreferenceChange}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          minimumQuantity={minimumQuantity}
          minimumRarity={minimumRarity}
          rarityOptions={collectionRarityOptions}
          onMinimumQuantityChange={handleMinimumQuantityChange}
          onMinimumRarityChange={handleMinimumRarityChange}
          tradePreferenceOptions={tradePreferenceOptions}
          filteredCards={filteredCards}
          selectedCardsCount={selectedCardsCount}
          selectedCardsTotal={selectedCardsTotal}
          activeOfferCount={activeOfferCount}
          remainingOffers={remainingOffers}
          onPrevPage={() => setPage(Math.max(page - 1, 1))}
          onNextPage={() => setPage(Math.min(page + 1, collectionPageCount))}
          getCardQuantity={selectedCardQuantity}
          updateSelection={updateSelection}
          recipientName={recipientName}
          recipientOwnershipByCard={recipientOwnershipByCard}
          onlyNewForRecipient={onlyNewForRecipient}
          onOnlyNewForRecipientChange={handleOnlyNewForRecipientChange}
          isRecipientOwnershipUnavailable={Boolean(recipientOwnershipError)}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="h-10 cursor-pointer rounded-lg game-primary-button bg-primary px-3 text-sm font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-55 max-sm:min-h-11 max-sm:min-w-11"
            disabled={selectedCardsCount === 0 || isSubmitting}
          >
            {isSubmitting ? m.trade_offer_sending() : m.trade_submit_offer()}
          </button>
          <button
            type="button"
            className="h-10 cursor-pointer rounded-lg border px-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-55 max-sm:min-h-11 max-sm:min-w-11"
            onClick={clearSelection}
          >
            {m.trade_offer_clear()}
          </button>
        </div>

        {isCollectionPending ? (
          <p className="text-sm font-semibold text-muted-foreground">
            {m.trade_loading_cards_for_offer()}
          </p>
        ) : null}
      </form>

      <TradeOfferComposerPreviewSection
        selectedEntries={selectedEntries}
        recipientName={recipientName}
        recipientAvatarUrl={auction.creatorAvatarUrl}
        recipientOwnershipByCard={recipientOwnershipByCard}
      />
    </section>
  )
}

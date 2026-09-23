import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CollectionSort,
  TradeAuctionResponse,
  TradeOfferItem,
  UserCollectionCard,
} from '@tcg-collection/shared'
import { useCreateTradeOfferMutationOption } from '@/lib/mutations/trade'
import { usePokemonCollectionAllQueryOption } from '@/lib/queries/pokemon'
import { useTradeRecipientOwnershipQueryOption } from '@/lib/queries/trade-recipient'
import { toast } from '@/features/toast/toast-store'
import {
  MAX_PENDING_OFFERS_PER_AUCTION_BY_USER,
  cardMatchesAuctionFilters,
  offerCardKey,
  toCardFinish,
} from '../lib/trade-utils'
import { m } from '@/paraglide/messages'
import { matchesCardNameSearch } from '@/features/dashboard/lib/card-search'

interface SelectedOfferCard {
  card: UserCollectionCard
  quantity: number
}

const PAGE_SIZE = 16

const pageCountOf = (cards: UserCollectionCard[]) =>
  Math.max(1, Math.ceil(cards.length / PAGE_SIZE))
const clampPage = (page: number, cards: UserCollectionCard[]) =>
  Math.max(1, Math.min(page, pageCountOf(cards)))
const pageOf = (cards: UserCollectionCard[], page: number) => {
  const start = (clampPage(page, cards) - 1) * PAGE_SIZE
  return cards.slice(start, start + PAGE_SIZE)
}

interface UseTradeOfferComposerProps {
  auction: TradeAuctionResponse
  userId?: string
  onOfferCreated: () => void
}

export interface UseTradeOfferComposerResult {
  isAuctionOwner: boolean
  canOffer: boolean
  canOfferReason:
    | 'not_connected'
    | 'auction_owner'
    | 'offer_limit_reached'
    | 'auction_inactive'
    | null
  offerLimitReached: boolean
  activeOfferCount: number
  remainingOffers: number
  page: number
  setPage: (page: number) => void
  preference: CollectionSort
  setPreference: (preference: CollectionSort) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  minimumQuantity: number
  setMinimumQuantity: (quantity: number) => void
  minimumRarity?: string
  setMinimumRarity: (rarity: string | undefined) => void
  onlyNewForRecipient: boolean
  setOnlyNewForRecipient: (value: boolean) => void
  collectionRarityOptions: string[]
  collectionPageCount: number
  collectionPage: number
  isCollectionPending: boolean
  hasEligibleCards: boolean
  filteredCards: UserCollectionCard[]
  selectedEntries: SelectedOfferCard[]
  selectedCardsCount: number
  selectedCardsTotal: number
  selectedCardQuantity: (card: UserCollectionCard) => number
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void
  clearSelection: () => void
  updateSelection: (card: UserCollectionCard, rawValue: string) => void
  isSubmitting: boolean
  recipientOwnershipByCard: ReadonlyMap<string, boolean>
  isRecipientOwnershipLoading: boolean
  recipientOwnershipError: string | null
  retryRecipientOwnership: () => void
}

export function useTradeOfferComposer({
  auction,
  userId,
  onOfferCreated,
}: UseTradeOfferComposerProps): UseTradeOfferComposerResult {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [preference, setPreference] = useState<CollectionSort>('quantity')
  const [searchQuery, setSearchQuery] = useState('')
  const [minimumQuantity, setMinimumQuantity] = useState(1)
  const [minimumRarity, setMinimumRarity] = useState<string>()
  const [selection, setSelection] = useState<Record<string, SelectedOfferCard>>({})
  const [onlyNewForRecipient, setOnlyNewForRecipient] = useState(false)

  const collection = useQuery(
    usePokemonCollectionAllQueryOption(
      {
        sort: preference,
        source: 'owned',
        minimumQuantity,
        minimumRarity,
      },
      {
        enabled: Boolean(userId),
      },
    ),
  )

  const createOffer = useMutation(
    useCreateTradeOfferMutationOption(queryClient, {
      onSuccess: () => {
        setSelection({})
        onOfferCreated()
      },
      onError: (error) => {
        toast.show(error.message)
      },
    }),
  )

  const isAuctionOwner = auction.creatorId === userId
  const activeOfferCount = userId
    ? auction.offers.filter((offer) => offer.proposerId === userId && offer.status === 'pending')
        .length
    : 0

  const remainingOffers = Math.max(0, MAX_PENDING_OFFERS_PER_AUCTION_BY_USER - activeOfferCount)
  const offerLimitReached = remainingOffers <= 0

  const canOffer =
    Boolean(userId) && !isAuctionOwner && auction.status === 'active' && !offerLimitReached

  const canOfferReason = (() => {
    if (!userId) {
      return 'not_connected' as const
    }

    if (!auction || auction.status !== 'active') {
      return 'auction_inactive' as const
    }

    if (isAuctionOwner) {
      return 'auction_owner' as const
    }

    if (offerLimitReached) {
      return 'offer_limit_reached' as const
    }

    return null
  })()

  const eligibleCards = useMemo(() => {
    const availableCards = collection.data?.cards ?? []

    return availableCards.filter((card) =>
      cardMatchesAuctionFilters(card, auction.requirements, auction.filters),
    )
  }, [collection.data?.cards, auction.requirements, auction.filters])
  const searchedCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return eligibleCards.filter((card) => matchesCardNameSearch(card, query))
  }, [eligibleCards, searchQuery])

  const selectedEntries = Object.values(selection)
  const recipientOwnership = useQuery(
    useTradeRecipientOwnershipQueryOption(
      userId,
      auction.id,
      [
        ...(onlyNewForRecipient ? eligibleCards : pageOf(searchedCards, page)),
        ...selectedEntries.map((entry) => entry.card),
      ].map((card) => card.id),
      canOffer,
    ),
  )
  const recipientOwnershipByCard = new Map<string, boolean>()
  if (!recipientOwnership.isError) {
    for (const card of recipientOwnership.data ?? []) {
      recipientOwnershipByCard.set(card.cardId, card.owned)
    }
  }

  const filteredCards = onlyNewForRecipient
    ? searchedCards.filter((card) => recipientOwnershipByCard.get(card.id) === false)
    : searchedCards
  const collectionPageCount = pageCountOf(filteredCards)
  const collectionPage = clampPage(page, filteredCards)
  const pagedCards = pageOf(filteredCards, page)
  const selectedCardsCount = selectedEntries.length
  const selectedCardsTotal = selectedEntries.reduce((acc, item) => acc + item.quantity, 0)

  const updateSelection = (card: UserCollectionCard, rawValue: string) => {
    const nextQuantity = Number(rawValue)

    if (Number.isNaN(nextQuantity) || nextQuantity <= 0) {
      setSelection((current) => {
        const key = offerCardKey(card.id, card.finish)

        if (!current[key]) {
          return current
        }

        const next = { ...current }
        delete next[key]

        return next
      })

      return
    }

    const clampedQuantity = Math.min(nextQuantity, card.quantity)
    const key = offerCardKey(card.id, card.finish)

    setSelection((current) => ({
      ...current,
      [key]: {
        card,
        quantity: clampedQuantity,
      },
    }))
  }

  const selectedCardQuantity = (card: UserCollectionCard): number => {
    return selection[offerCardKey(card.id, card.finish)]?.quantity ?? 0
  }

  const createOfferPayload = (): TradeOfferItem[] => {
    return selectedEntries
      .filter((card) => card.quantity > 0)
      .map((card) => ({
        cardId: card.card.id,
        finish: toCardFinish(card.card.finish),
        quantity: card.quantity,
      }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!canOffer) {
      toast.show(m.trade_cannot_make_offer())
      return
    }

    const payload = createOfferPayload()

    if (payload.length === 0) {
      toast.show(m.trade_add_card_before_send_offer())
      return
    }

    createOffer.mutate({
      auctionId: auction.id,
      payload: {
        cards: payload,
      },
    })
  }

  const clearSelection = () => {
    setSelection({})
  }

  return {
    isAuctionOwner,
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
    collectionRarityOptions: collection.data?.rarities ?? [],
    collectionPageCount,
    collectionPage,
    isCollectionPending: collection.isPending,
    hasEligibleCards: eligibleCards.length > 0,
    filteredCards: pagedCards,
    selectedEntries,
    selectedCardsCount,
    selectedCardsTotal,
    selectedCardQuantity,
    handleSubmit,
    clearSelection,
    updateSelection,
    isSubmitting: createOffer.isPending,
    recipientOwnershipByCard,
    isRecipientOwnershipLoading: recipientOwnership.isLoading,
    recipientOwnershipError: recipientOwnership.error?.message ?? null,
    retryRecipientOwnership: () => void recipientOwnership.refetch(),
  }
}

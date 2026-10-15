import { useMemo, useState, useSyncExternalStore } from 'react'
import { BookOpenIcon, CheckIcon, Clock3Icon, EyeIcon, UserRoundIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  TradeAuctionKind,
  TradeAuctionResponse,
  TradeOfferResponse,
} from '@tcg-collection/shared'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'
import { formatCardFinish } from '@/features/dashboard/lib/card-format'
import {
  describeAuctionRemaining,
  getAuctionRemainingMs,
  MAX_ACTIVE_AUCTIONS_PER_USER,
  offerCardKey,
} from '../lib/trade-utils'
import { tradeClock } from '../lib/trade-clock'
import { TradeAuctionList } from '../components/TradeAuctionList'
import { TradeOfferComposer } from '../components/TradeOfferComposer'
import { TradeOffersPanel } from '../components/TradeOffersPanel'
import { TradeBadge } from '../components/TradeBadge'
import { TradeNotOwnedBadge, TradeOwnedBadge } from '../components/TradeNotOwnedBadge'
import { TradeNotificationModal } from '../components/TradeNotificationModal'
import { TradeCreateAuctionDialog } from '../components/TradeCreateAuctionDialog'
import { TradeCreateRequestDialog } from '../components/TradeCreateRequestDialog'
import { TradeOfferSuccessDialog } from '../components/TradeOfferSuccessDialog'
import { toast } from '@/features/toast/toast-store'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { CardImageDialog } from '@/features/dashboard/components/CardImageDialog'
import { formatRarity } from '@/features/i18n/rarity-labels'
import {
  useAcceptTradeOfferMutationOption,
  useCancelTradeAuctionMutationOption,
  useCancelTradeOfferMutationOption,
} from '@/lib/mutations/trade'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import {
  useOwnedCardIdsQueryOption,
  usePokemonCollectionAllQueryOption,
  usePokemonPreviewCardsQueryOption,
  usePokemonSetsQueryOption,
} from '@/lib/queries/pokemon'
import { useTradeAuctionQueryOption, useTradeAuctionsQueryOption } from '@/lib/queries/trade'
import { BoosterPreviewDialog } from '@/features/dashboard/components/BoosterPreviewDialog'
import { buildAcceptedOfferNotification } from '../lib/trade-notification-factory'
import { getTradeFilterBadges, getTradeRequirementBadges } from '../lib/trade-constraint-display'

const AUCTIONS_PER_PAGE = 8
const getHiResAvatarUrl = (avatarUrl: string | undefined): string | undefined => {
  if (!avatarUrl) {
    return avatarUrl
  }

  try {
    if (!avatarUrl.includes('avatars.slack-edge.com')) {
      return avatarUrl
    }

    return avatarUrl.replace(/-(\d+)\.(jpe?g|png|webp)(?=$|\?)/i, '-512.$2')
  } catch {
    return avatarUrl
  }
}

type TradeOfferForModal = TradeOfferResponse

export function TradeView() {
  const { locale } = useLocale()
  const now = useSyncExternalStore(
    tradeClock.subscribe,
    tradeClock.getSnapshot,
    tradeClock.getSnapshot,
  )

  const [kind, setKind] = useState<TradeAuctionKind>('offer')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [selectedAuctionId, setSelectedAuctionId] = useState<string | undefined>()
  const [isAuctionCardOpen, setIsAuctionCardOpen] = useState(false)
  const [isAuctionSetPreviewOpen, setIsAuctionSetPreviewOpen] = useState(false)
  const [auctionPage, setAuctionPage] = useState(1)
  const [showOnlyNotOwned, setShowOnlyNotOwned] = useState(false)
  const [showOnlyOwned, setShowOnlyOwned] = useState(false)
  const [isOfferSuccessDialogOpen, setIsOfferSuccessDialogOpen] = useState(false)
  const [acceptedOffer, setAcceptedOffer] = useState<TradeOfferForModal | null>(null)
  const [acceptedAuction, setAcceptedAuction] = useState<TradeAuctionResponse | null>(null)
  const [isTradeAcceptedNotificationOpen, setIsTradeAcceptedNotificationOpen] = useState(false)

  const queryClient = useQueryClient()
  const auth = useQuery(useCurrentUserQueryOption())
  const auctions = useQuery(useTradeAuctionsQueryOption())
  const currentUserId = auth.data?.authenticated ? auth.data.user.id : undefined

  const auctionsFromList = auctions.data?.auctions ?? []
  const kindAuctions = auctionsFromList.filter((auction) => auction.kind === kind)
  const isRequestTab = kind === 'request'
  const userActiveAuctions = currentUserId
    ? kindAuctions.filter(
        (auction) => auction.creatorId === currentUserId && auction.status === 'active',
      ).length
    : 0
  const canOpenCreateAuction = Boolean(
    auth.data?.authenticated &&
    Boolean(currentUserId) &&
    userActiveAuctions < MAX_ACTIVE_AUCTIONS_PER_USER,
  )

  const auctionQueryEnabled = Boolean(selectedAuctionId && isDetailsDialogOpen)
  const auctionQuery = useQuery(useTradeAuctionQueryOption(selectedAuctionId, auctionQueryEnabled))
  const ownedCardIdsQuery = useQuery(useOwnedCardIdsQueryOption(Boolean(auth.data?.authenticated)))
  const selectedAuction =
    auctionQueryEnabled && auctionQuery.data
      ? auctionQuery.data
      : selectedAuctionId
        ? auctionsFromList.find((auction) => auction.id === selectedAuctionId)
        : undefined
  const setsQuery = useQuery(usePokemonSetsQueryOption())
  const selectedAuctionSetCardsQuery = useQuery(
    usePokemonPreviewCardsQueryOption(selectedAuction?.offeredCard.setId),
  )
  // Finish-agnostic set of owned card ids (see listOwnedCardIds).
  const ownedCardIds = useMemo(
    () => (ownedCardIdsQuery.data ? new Set(ownedCardIdsQuery.data) : undefined),
    [ownedCardIdsQuery.data],
  )

  const ownCollectionQuery = useQuery(
    usePokemonCollectionAllQueryOption(
      { sort: 'recent', source: 'owned' },
      { enabled: Boolean(currentUserId) && isRequestTab },
    ),
  )
  const ownedCardKeys = useMemo(
    () =>
      ownCollectionQuery.data
        ? new Set(ownCollectionQuery.data.cards.map((card) => offerCardKey(card.id, card.finish)))
        : undefined,
    [ownCollectionQuery.data],
  )

  const canFilterOnlyNotOwned = Boolean(currentUserId) && !isRequestTab
  const isOnlyNotOwnedActive = canFilterOnlyNotOwned && showOnlyNotOwned && Boolean(ownedCardIds)
  const canFilterOnlyOwned = Boolean(currentUserId) && isRequestTab
  const isOnlyOwnedActive = canFilterOnlyOwned && showOnlyOwned && Boolean(ownedCardKeys)
  // Hide an auction as soon as the user owns any finish of the offered card.
  const visibleAuctions =
    isOnlyNotOwnedActive && ownedCardIds
      ? kindAuctions.filter((auction) => !ownedCardIds.has(auction.offeredCard.id))
      : isOnlyOwnedActive && ownedCardKeys
        ? kindAuctions.filter((auction) =>
            ownedCardKeys.has(offerCardKey(auction.offeredCard.id, auction.offeredCardFinish)),
          )
        : kindAuctions
  const auctionPageCount = Math.max(1, Math.ceil(visibleAuctions.length / AUCTIONS_PER_PAGE))

  const cancelAuctionMutation = useMutation(
    useCancelTradeAuctionMutationOption(queryClient, {
      onSuccess: () => {
        setSelectedAuctionId(undefined)
        setIsDetailsDialogOpen(false)
      },
    }),
  )
  const cancelOfferMutation = useMutation(useCancelTradeOfferMutationOption(queryClient))
  const acceptOfferMutation = useMutation(
    useAcceptTradeOfferMutationOption(queryClient, {
      onError: () => {
        toast.show(m.trade_accept_offer_error())
      },
    }),
  )

  const closeAuctionDetails = () => {
    setIsDetailsDialogOpen(false)
    setSelectedAuctionId(undefined)
    setIsAuctionCardOpen(false)
    setIsAuctionSetPreviewOpen(false)
  }
  function auctionDetailsOpenChanged(open: boolean) {
    if (!open) closeAuctionDetails()
  }
  const closeOfferSuccessDialog = () => {
    setIsOfferSuccessDialogOpen(false)
  }
  const closeAcceptTradeNotification = () => {
    setIsTradeAcceptedNotificationOpen(false)
    setAcceptedOffer(null)
    setAcceptedAuction(null)
  }

  const isAnyActionRunning =
    cancelOfferMutation.isPending ||
    acceptOfferMutation.isPending ||
    cancelAuctionMutation.isPending

  if (auctions.error) {
    const message =
      auctions.error instanceof Error ? auctions.error.message : String(auctions.error)

    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        {m.trade_view_load_error()} {message ? `(${message})` : null}
      </div>
    )
  }

  const remainingMs = (expiresAt: string) => getAuctionRemainingMs(expiresAt, now)

  const openAuction = (auctionId: string) => {
    setSelectedAuctionId(auctionId)
    setIsDetailsDialogOpen(true)
    setIsAuctionCardOpen(false)
    setIsAuctionSetPreviewOpen(false)
    setAuctionPage((current) => Math.min(current, auctionPageCount))
  }

  const getAuctionSetName = (setId: string): string => {
    return setsQuery.data?.find((set) => set.id === setId)?.name ?? setId
  }

  const selectedAuctionSet = selectedAuction
    ? (setsQuery.data?.find((set) => set.id === selectedAuction.offeredCard.setId) ?? {
        id: selectedAuction.offeredCard.setId,
        name: getAuctionSetName(selectedAuction.offeredCard.setId),
        series: '',
        total: 0,
        releaseDate: '',
      })
    : undefined

  const setCardsToDisplay = selectedAuctionSetCardsQuery.data ?? []
  const isSelectedRequest = selectedAuction?.kind === 'request'
  const selectedAuctionFilterBadges = selectedAuction
    ? getTradeFilterBadges(selectedAuction.filters, getAuctionSetName)
    : []
  const selectedAuctionRequirementBadges = selectedAuction
    ? getTradeRequirementBadges(selectedAuction.requirements, getAuctionSetName)
    : []

  const clampedAuctionPage = Math.min(auctionPage, auctionPageCount)
  const auctionStart = (clampedAuctionPage - 1) * AUCTIONS_PER_PAGE
  const auctionsPage = visibleAuctions.slice(auctionStart, auctionStart + AUCTIONS_PER_PAGE)

  return (
    <div className="flex w-full max-w-7xl flex-col gap-4">
      <header className="game-page-heading p-1 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              {m.trade_view_title()}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isRequestTab ? m.trade_request_subtitle() : m.trade_view_subtitle()}
            </p>
            {currentUserId ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {(isRequestTab ? m.trade_request_creation_quota : m.trade_auction_creation_quota)({
                  used: userActiveAuctions,
                  max: MAX_ACTIVE_AUCTIONS_PER_USER,
                })}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            disabled={!canOpenCreateAuction}
            onClick={() => {
              if (canOpenCreateAuction) {
                setIsCreateDialogOpen(true)
              }
            }}
          >
            {isRequestTab ? m.trade_create_request() : m.trade_create_auction()}
          </Button>
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {(['offer', 'request'] as const).map((tab) => (
              <Button
                key={tab}
                type="button"
                variant={kind === tab ? 'default' : 'outline'}
                size="sm"
                aria-pressed={kind === tab}
                onClick={() => {
                  setKind(tab)
                  setAuctionPage(1)
                }}
              >
                {tab === 'request' ? m.trade_tab_requests() : m.trade_tab_auctions()}
              </Button>
            ))}
          </div>
          {canFilterOnlyNotOwned ? (
            <Button
              type="button"
              variant={showOnlyNotOwned ? 'default' : 'outline'}
              size="sm"
              aria-pressed={showOnlyNotOwned}
              onClick={() => {
                setShowOnlyNotOwned((value) => !value)
                setAuctionPage(1)
              }}
            >
              <BookOpenIcon className="size-4" aria-hidden="true" />
              {m.trade_filter_only_not_owned()}
            </Button>
          ) : null}
          {canFilterOnlyOwned ? (
            <Button
              type="button"
              variant={showOnlyOwned ? 'default' : 'outline'}
              size="sm"
              aria-pressed={showOnlyOwned}
              onClick={() => {
                setShowOnlyOwned((value) => !value)
                setAuctionPage(1)
              }}
            >
              <CheckIcon className="size-4" aria-hidden="true" />
              {m.trade_filter_only_owned()}
            </Button>
          ) : null}
        </div>
        <TradeAuctionList
          kind={kind}
          auctions={auctionsPage}
          selectedAuctionId={selectedAuctionId}
          locale={locale}
          currentUserId={currentUserId}
          ownedCardIds={isRequestTab ? undefined : ownedCardIds}
          ownedCardKeys={isRequestTab ? ownedCardKeys : undefined}
          getRemainingMs={remainingMs}
          onSelectAuction={openAuction}
          isCancelling={cancelAuctionMutation.isPending}
          onCancelAuction={(auctionId) => cancelAuctionMutation.mutate(auctionId)}
          page={clampedAuctionPage}
          pageCount={auctionPageCount}
          onPageChange={(nextPage) =>
            setAuctionPage(Math.min(Math.max(1, nextPage), auctionPageCount))
          }
        />
      </div>

      {isCreateDialogOpen && isRequestTab ? (
        <TradeCreateRequestDialog
          open
          activeRequests={userActiveAuctions}
          ownedCardKeys={ownedCardKeys}
          onClose={() => setIsCreateDialogOpen(false)}
        />
      ) : null}

      <TradeCreateAuctionDialog
        open={isCreateDialogOpen && !isRequestTab}
        locale={locale}
        auth={auth.data ?? { authenticated: false }}
        activeAuctions={userActiveAuctions}
        onClose={() => setIsCreateDialogOpen(false)}
        onAuctionCreated={() => setIsCreateDialogOpen(false)}
      />

      {isDetailsDialogOpen ? (
        <Dialog open onOpenChange={auctionDetailsOpenChanged}>
          <DialogContent
            className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-4xl overflow-y-auto overflow-x-hidden sm:max-w-4xl"
            closeLabel={m.pvp_close()}
          >
            <DialogTitle className="pr-12">
              {isSelectedRequest ? m.trade_request_details() : m.trade_auction_details()}
            </DialogTitle>

            {selectedAuction ? (
              <div className="space-y-4">
                <div className="rounded-md border bg-background p-3">
                  <div className="flex items-center gap-2">
                    {selectedAuction.creatorAvatarUrl ? (
                      <img
                        src={getHiResAvatarUrl(selectedAuction.creatorAvatarUrl)}
                        alt=""
                        width={56}
                        height={56}
                        className="size-14 shrink-0 rounded-full border border-sidebar-accent/50 object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full border border-sidebar-accent/50 bg-sidebar-accent/10">
                        <UserRoundIcon className="size-7 text-sidebar-accent" aria-hidden="true" />
                      </span>
                    )}
                    <div>
                      <p className="text-sm font-black">
                        {selectedAuction.creatorDisplayName ?? selectedAuction.creatorPseudo}{' '}
                        {isSelectedRequest
                          ? m.trade_requests_card_from()
                          : m.trade_offers_cards_from()}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                        <Clock3Icon className="size-4" aria-hidden="true" />
                        {m.trade_remaining_label()}{' '}
                        {describeAuctionRemaining(remainingMs(selectedAuction.expiresAt), locale)}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`mt-2 grid gap-3 md:grid-cols-[1fr_18rem] ${isSelectedRequest ? 'md:items-start' : 'md:items-center'}`}
                  >
                    <div className="space-y-3">
                      <div className="rounded-sm border border-border bg-card/40 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">
                            {m.trade_card_details_title()}
                          </p>
                          {isSelectedRequest ? (
                            ownedCardKeys?.has(
                              offerCardKey(
                                selectedAuction.offeredCard.id,
                                selectedAuction.offeredCardFinish,
                              ),
                            ) ? (
                              <TradeOwnedBadge />
                            ) : ownedCardKeys ? (
                              <TradeNotOwnedBadge />
                            ) : null
                          ) : ownedCardIds && !ownedCardIds.has(selectedAuction.offeredCard.id) ? (
                            <TradeNotOwnedBadge />
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm font-semibold">
                          {selectedAuction.offeredCard.name}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <p>
                            {m.trade_card_number_label()} {selectedAuction.offeredCard.number}
                          </p>
                          <p>
                            {m.trade_card_rarity_label()}{' '}
                            <TradeBadge
                              kind="rarity"
                              value={selectedAuction.offeredCard.rarity ?? 'Unknown'}
                            >
                              {selectedAuction.offeredCard.rarity
                                ? formatRarity(selectedAuction.offeredCard.rarity)
                                : m.rarity_other()}
                            </TradeBadge>
                          </p>
                          <p className="flex items-center gap-2">
                            <span>{m.trade_card_set_label()}</span>
                            <TradeBadge
                              kind="set"
                              value={selectedAuction.offeredCard.setId}
                              className="max-w-34 truncate"
                            >
                              {getAuctionSetName(selectedAuction.offeredCard.setId)}
                            </TradeBadge>
                            <button
                              type="button"
                              className="rounded-full border border-border bg-background p-1.5 hover:bg-muted cursor-pointer"
                              onClick={() => {
                                setIsAuctionSetPreviewOpen(true)
                              }}
                              aria-label={m.packs_view_cards_aria({
                                name: getAuctionSetName(selectedAuction.offeredCard.setId),
                              })}
                            >
                              <EyeIcon className="size-4" aria-hidden="true" />
                            </button>
                          </p>
                          <p>
                            <span className="text-muted-foreground">
                              {m.trade_card_finish_label()}
                            </span>
                            <TradeBadge
                              kind="finish"
                              value={selectedAuction.offeredCardFinish}
                              className="ml-1"
                            >
                              {formatCardFinish(selectedAuction.offeredCardFinish)}
                            </TradeBadge>
                          </p>
                        </div>
                      </div>
                      <div
                        className="rounded-sm border border-border bg-card/40 p-2"
                        hidden={isSelectedRequest}
                      >
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {m.trade_requirements_label()}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {selectedAuctionRequirementBadges.length > 0 ? (
                            selectedAuctionRequirementBadges.map((badge) => (
                              <TradeBadge key={badge.id} kind={badge.kind} value={badge.value}>
                                {badge.label}: {badge.displayValue}
                              </TradeBadge>
                            ))
                          ) : (
                            <TradeBadge kind="default">{m.trade_any_card()}</TradeBadge>
                          )}
                        </div>
                        <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
                          {m.trade_restrictions_label()}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedAuctionFilterBadges.length > 0 ? (
                            selectedAuctionFilterBadges.map((filterText) => (
                              <TradeBadge
                                key={filterText.id}
                                kind={filterText.kind}
                                value={filterText.value}
                              >
                                {filterText.kind === 'set'
                                  ? filterText.displayValue
                                  : `${filterText.label}: ${filterText.displayValue}`}
                              </TradeBadge>
                            ))
                          ) : (
                            <TradeBadge kind="default">{m.trade_no_restriction()}</TradeBadge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="relative bg-card p-2">
                      <div className="mx-auto flex w-full max-w-[20rem] items-center justify-center">
                        {selectedAuction.offeredCard.imageLarge ||
                        selectedAuction.offeredCard.imageSmall ? (
                          <button
                            type="button"
                            className="w-full cursor-pointer"
                            onClick={(event) => {
                              event.stopPropagation()
                              setIsAuctionCardOpen(true)
                            }}
                          >
                            <FoilCardImage
                              src={
                                selectedAuction.offeredCard.imageLarge ||
                                selectedAuction.offeredCard.imageSmall ||
                                ''
                              }
                              alt={selectedAuction.offeredCard.name}
                              cardId={selectedAuction.offeredCard.id}
                              finish={selectedAuction.offeredCardFinish}
                              rarity={selectedAuction.offeredCard.rarity}
                              supertype={selectedAuction.offeredCard.supertype}
                              isEvolved={selectedAuction.offeredCard.isEvolved}
                              className="aspect-63/88 w-full rounded-lg"
                            />
                          </button>
                        ) : (
                          <div
                            className="aspect-63/88 w-full rounded-lg bg-muted"
                            aria-hidden="true"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <TradeOffersPanel
                  auction={selectedAuction}
                  userId={currentUserId}
                  ownedCardIds={ownedCardIds}
                  onCancelOffer={(offerId) => cancelOfferMutation.mutate(offerId)}
                  onAcceptOffer={(offerId) => {
                    if (!selectedAuctionId) {
                      toast.show(m.trade_accept_offer_error())
                      return
                    }

                    const offerToAccept = selectedAuction.offers.find(
                      (offer) => offer.id === offerId,
                    )

                    if (!offerToAccept) {
                      toast.show(m.trade_accept_offer_error())
                      return
                    }

                    acceptOfferMutation.mutate(
                      {
                        auctionId: selectedAuctionId,
                        offerId,
                      },
                      {
                        onSuccess: () => {
                          setAcceptedOffer(offerToAccept)
                          setAcceptedAuction(selectedAuction)
                          setIsTradeAcceptedNotificationOpen(true)
                          closeAuctionDetails()
                          void auctionQuery.refetch()
                        },
                        onError: () => {
                          setAcceptedOffer(null)
                          setAcceptedAuction(null)
                        },
                      },
                    )
                  }}
                  isBusy={isAnyActionRunning}
                />

                <TradeOfferComposer
                  key={`trade-offer-${selectedAuction.id}-${locale}`}
                  auction={selectedAuction}
                  userId={currentUserId}
                  onOfferCreated={() => {
                    auctionQuery.refetch()
                    closeAuctionDetails()
                    setIsOfferSuccessDialogOpen(true)
                  }}
                />
              </div>
            ) : isDetailsDialogOpen && selectedAuctionId && auctionQuery.isPending ? (
              <p className="text-sm font-semibold text-muted-foreground">
                {m.trade_loading_auction_details()}
              </p>
            ) : selectedAuctionId ? (
              <p className="text-sm font-semibold text-muted-foreground">
                {m.trade_auction_not_found()}
              </p>
            ) : (
              <p className="text-sm font-semibold text-muted-foreground">
                {m.trade_pick_auction_to_inspect()}
              </p>
            )}
            {selectedAuction && isAuctionCardOpen ? (
              <CardImageDialog
                card={{
                  ...selectedAuction.offeredCard,
                  finish: selectedAuction.offeredCardFinish,
                }}
                onClose={() => setIsAuctionCardOpen(false)}
              />
            ) : null}

            {selectedAuction && isAuctionSetPreviewOpen ? (
              <BoosterPreviewDialog
                cards={setCardsToDisplay}
                isPending={selectedAuctionSetCardsQuery.isPending}
                set={
                  selectedAuctionSet ?? {
                    id: selectedAuction.offeredCard.setId,
                    name: getAuctionSetName(selectedAuction.offeredCard.setId),
                    series: '',
                    total: 0,
                    releaseDate: '',
                  }
                }
                ownedCardIds={ownedCardIds}
                onClose={() => setIsAuctionSetPreviewOpen(false)}
              />
            ) : null}
          </DialogContent>
        </Dialog>
      ) : null}

      <TradeOfferSuccessDialog open={isOfferSuccessDialogOpen} onClose={closeOfferSuccessDialog} />

      {isTradeAcceptedNotificationOpen && acceptedOffer && acceptedAuction ? (
        <TradeNotificationModal
          notification={buildAcceptedOfferNotification(acceptedAuction, acceptedOffer)}
          ownedCardIds={ownedCardIds}
          onClose={closeAcceptTradeNotification}
        />
      ) : null}
    </div>
  )
}

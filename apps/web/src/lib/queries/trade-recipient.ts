import { queryOptions } from '@tanstack/react-query'
import {
  MAX_TRADE_OWNERSHIP_CARD_IDS,
  type TradeRecipientCardOwnership,
} from '@tcg-collection/shared'
import { api } from '@/lib/api-client'
import { tradeQueryKeys } from '@/features/trade/lib/query-keys'
import { m } from '@/paraglide/messages'
import { readTradeError } from './trade'

export const useTradeRecipientOwnershipQueryOption = (
  userId: string | undefined,
  auctionId: string,
  requestedCardIds: string[],
  enabled: boolean,
) => {
  const cardIds = [...new Set(requestedCardIds)].sort()

  return queryOptions({
    queryKey: tradeQueryKeys.recipientOwnership(userId ?? '', auctionId, cardIds),
    enabled: Boolean(userId) && enabled && cardIds.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30_000,
    meta: { suppressToast: true },
    queryFn: async (): Promise<TradeRecipientCardOwnership[]> => {
      const cards: TradeRecipientCardOwnership[] = []
      for (let offset = 0; offset < cardIds.length; offset += MAX_TRADE_OWNERSHIP_CARD_IDS) {
        const result = await api.trade.auctions({ auctionId })['recipient-ownership'].post({
          cardIds: cardIds.slice(offset, offset + MAX_TRADE_OWNERSHIP_CARD_IDS),
        })
        if (result.error) {
          throw new Error(
            readTradeError(
              result.error,
              result.response,
              result.status,
              m.trade_recipient_unavailable(),
            ),
          )
        }
        cards.push(...result.data.cards)
      }
      return cards
    },
  })
}

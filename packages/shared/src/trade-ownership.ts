export const MAX_TRADE_OWNERSHIP_CARD_IDS = 100

export interface TradeRecipientCardOwnership {
  cardId: string
  owned: boolean
}

export interface TradeRecipientOwnershipResponse {
  cards: TradeRecipientCardOwnership[]
}

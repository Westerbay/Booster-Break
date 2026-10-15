import type { AppPrisma } from '../db/prisma'
import { cardFinishKey } from './card-finish-key'

export interface ReservedCardCopies {
  cardId: string
  finish: string
  quantity: number
}

export const listReservedCardQuantities = async (
  db: AppPrisma,
  userId: string,
  cardIds: string[],
): Promise<ReservedCardCopies[]> => {
  if (cardIds.length === 0) {
    return []
  }

  // Request offer cards are picked from the creator, who never agreed to give them: hold only the proposer's copy.
  const [auctions, offerCards, requestOffers] = await Promise.all([
    db.tradeAuction.findMany({
      where: {
        creatorId: userId,
        kind: 'offer',
        status: 'active',
        offeredCardId: { in: cardIds },
      },
      select: { offeredCardId: true, offeredCardFinish: true },
    }),
    db.tradeOfferCard.findMany({
      where: {
        cardId: { in: cardIds },
        offer: { proposerId: userId, status: 'pending', auction: { kind: 'offer' } },
      },
      select: { cardId: true, finish: true, quantity: true },
    }),
    db.tradeOffer.findMany({
      where: {
        proposerId: userId,
        status: 'pending',
        auction: { kind: 'request', offeredCardId: { in: cardIds } },
      },
      select: { auction: { select: { offeredCardId: true, offeredCardFinish: true } } },
    }),
  ])

  const reservedByKey = new Map<string, ReservedCardCopies>()

  const reserve = (cardId: string, finish: string, quantity: number) => {
    const key = cardFinishKey(cardId, finish)
    const existing = reservedByKey.get(key)

    if (existing) {
      existing.quantity += quantity
      return
    }

    reservedByKey.set(key, { cardId, finish, quantity })
  }

  for (const auction of auctions) {
    reserve(auction.offeredCardId, auction.offeredCardFinish, 1)
  }

  for (const offerCard of offerCards) {
    reserve(offerCard.cardId, offerCard.finish, offerCard.quantity)
  }

  for (const { auction } of requestOffers) {
    reserve(auction.offeredCardId, auction.offeredCardFinish, 1)
  }

  return [...reservedByKey.values()]
}

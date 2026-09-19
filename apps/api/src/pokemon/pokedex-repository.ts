import type {
  PokedexOverviewResponse,
  PokedexSetResponse,
  SupportedLocale,
} from '@tcg-collection/shared'
import type { Prisma } from '@prisma/client'
import { toCardSummary, toSetSummary } from './pokemon-mappers'

const cardNumberOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

export class PokedexRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async overview(userId: string, locale: SupportedLocale): Promise<PokedexOverviewResponse> {
    const [catalog, counts] = await Promise.all([
      this.db.pokemonSet.findMany({
        where: { cards: { some: {} } },
        include: { _count: { select: { cards: true } } },
        orderBy: [{ releaseDate: 'desc' }, { id: 'asc' }],
      }),
      this.db.$queryRaw<{ setId: string; count: bigint }[]>`
        SELECT c."set_id" AS "setId", COUNT(*) AS "count"
        FROM "user_card_discoveries" d
        JOIN "pokemon_cards" c ON c."id" = d."card_id"
        WHERE d."user_id" = ${userId}
        GROUP BY c."set_id"
      `,
    ])
    const discoveries = new Map(counts.map((row) => [row.setId, Number(row.count)]))
    const sets = catalog.map((set) => ({
      ...toSetSummary(set, locale),
      catalogCount: set._count.cards,
      discoveredCount: discoveries.get(set.id) ?? 0,
    }))
    return {
      sets,
      totalCards: sets.reduce((total, set) => total + set.catalogCount, 0),
      discoveredCards: sets.reduce((total, set) => total + set.discoveredCount, 0),
    }
  }

  async getSet(
    userId: string,
    setId: string,
    requestedPage: number,
    pageSize: number,
    locale: SupportedLocale,
  ): Promise<PokedexSetResponse | undefined> {
    const set = await this.db.pokemonSet.findUnique({
      where: { id: setId },
      include: { cards: { select: { id: true, localId: true } } },
    })
    if (!set?.cards.length) return undefined

    // Only the small number/id index is read for the set. Artwork and discovery
    // metadata are fetched for the bounded page, in natural collector-number order.
    const index = set.cards.sort(
      (first, second) =>
        cardNumberOrder.compare(first.localId, second.localId) || first.id.localeCompare(second.id),
    )
    const total = index.length
    const pageCount = Math.ceil(total / pageSize)
    const page = Math.min(requestedPage, pageCount)
    const pageIds = index.slice((page - 1) * pageSize, page * pageSize).map((card) => card.id)
    const [cards, discoveredCount] = await Promise.all([
      this.db.pokemonCard.findMany({
        where: { id: { in: pageIds } },
        include: {
          discoveries: { where: { userId }, select: { firstObtainedAt: true, bestFinish: true } },
        },
      }),
      this.db.userCardDiscovery.count({ where: { userId, card: { setId } } }),
    ])
    const positions = new Map(pageIds.map((id, position) => [id, position]))
    cards.sort((first, second) => positions.get(first.id)! - positions.get(second.id)!)

    return {
      set: { ...toSetSummary(set, locale), catalogCount: total, discoveredCount },
      slots: cards.map((card) => ({
        card: toCardSummary(card, card.discoveries[0]?.bestFinish, locale),
        discovered: card.discoveries.length > 0,
        firstObtainedAt: card.discoveries[0]?.firstObtainedAt.toISOString(),
      })),
      pagination: { page, pageSize, total, pageCount },
    }
  }
}

import { Prisma, type PokemonCard } from '@prisma/client'
import {
  PVP_RULES,
  type PvpCardFilters,
  type CombatCard,
  type PvpBoardResponse,
  type PvpBoardTrainer,
  type PvpCardRecord,
  type PvpCardsResponse,
  type PvpTeamSelection,
  type PvpTrainer,
  type SupportedLocale,
} from '@tcg-collection/shared'
import { toCardSummary } from '../pokemon/pokemon-mappers'
import { PvpError } from './pvp-error'
import { readCombatTraits, validateTeam } from './pvp-rules'

interface RankedTrainer extends PvpTrainer {
  rank: bigint
}
interface RankedCardStat {
  userId: string
  cardId: string
  wins: number
  losses: number
  draws: number
}

export class PvpRepository {
  constructor(private readonly db: Prisma.TransactionClient) {}

  async lockPlayers(ids: string[]) {
    await this.db
      .$queryRaw`SELECT id FROM users WHERE id IN (${Prisma.join([...ids].sort())}) ORDER BY id FOR UPDATE`
  }

  async team(userId: string, selection: PvpTeamSelection[]): Promise<CombatCard[]> {
    const cards = await this.db.pokemonCard.findMany({
      where: { id: { in: selection.map((item) => item.cardId) } },
      include: {
        userCards: { where: { userId, quantity: { gt: 0 } } },
        giftedUserCards: { where: { userId, quantity: { gt: 0 } } },
      },
    })
    const team = selection.map((item) => {
      const card = cards.find((card) => card.id === item.cardId)
      const owned =
        card &&
        [...card.userCards, ...card.giftedUserCards].some((row) => row.finish === item.finish)
      const traits = card && readCombatTraits(card.rawJson)
      if (!card || !owned || !traits) throw new PvpError('pvp_card_unavailable')
      return {
        ...toCardSummary(card, item.finish, 'en'),
        ...traits,
        finish: item.finish,
        nameEn: card.nameEn ?? card.name,
        nameFr: card.nameFr ?? card.nameEn ?? card.name,
      }
    })
    validateTeam(team)
    return team
  }

  async cards(
    userId: string,
    locale: SupportedLocale,
    page: number,
    search: string,
    filters: PvpCardFilters = {},
  ): Promise<PvpCardsResponse> {
    const pageSize = 24
    const ownership = {
      userId,
      quantity: { gt: 0 },
      ...(filters.finish ? { finish: filters.finish } : {}),
    }
    const rows = await this.db.pokemonCard.findMany({
      where: {
        category: 'Pokemon',
        ...(filters.rarity ? { rarity: filters.rarity } : {}),
        AND: [
          { OR: [{ userCards: { some: ownership } }, { giftedUserCards: { some: ownership } }] },
          {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { nameFr: { contains: search, mode: 'insensitive' } },
              { nameEn: { contains: search, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: { userCards: { where: ownership }, giftedUserCards: { where: ownership } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    })
    const cards: CombatCard[] = []
    for (const row of rows.slice(0, pageSize)) {
      const traits = readCombatTraits(row.rawJson)
      if (!traits) continue
      const finishes = new Set(
        [...row.userCards, ...row.giftedUserCards].map((owned) => owned.finish),
      )
      for (const finish of finishes) {
        if (finish !== 'normal' && finish !== 'holo' && finish !== 'reverse_holo') continue
        cards.push({ ...toCardSummary(row, finish, locale), ...traits, finish })
      }
    }
    return { cards, page, hasMore: rows.length > pageSize }
  }

  async board(
    locale: SupportedLocale,
    page: number,
    { userId, rankedOnly = false }: { userId?: string; rankedOnly?: boolean } = {},
  ): Promise<PvpBoardResponse> {
    const pageSize = 20
    let filter = Prisma.empty
    if (userId) filter = Prisma.sql`WHERE "userId" = ${userId}`
    else if (rankedOnly) filter = Prisma.sql`WHERE wins + losses + draws > 0`
    const [rows, total] = await Promise.all([
      this.db.$queryRaw<RankedTrainer[]>(Prisma.sql`
        WITH ranked AS (
          SELECT u.id AS "userId", COALESCE(u.display_name, u.pseudo) AS name, u.avatar_url AS "avatarUrl",
            COALESCE(r.elo, ${PVP_RULES.initialElo})::int AS elo, COALESCE(r.wins, 0)::int AS wins,
            COALESCE(r.losses, 0)::int AS losses, COALESCE(r.draws, 0)::int AS draws,
            ROW_NUMBER() OVER (ORDER BY COALESCE(r.wins + r.losses + r.draws, 0) > 0 DESC, COALESCE(r.elo, ${PVP_RULES.initialElo}) DESC, COALESCE(r.wins, 0) DESC, u.id) AS rank
          FROM users u LEFT JOIN pvp_ratings r ON r.user_id = u.id
        ) SELECT * FROM ranked ${filter} ORDER BY rank LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `),
      rankedOnly
        ? this.db.pvpRating.count({
            where: { OR: [{ wins: { gt: 0 } }, { losses: { gt: 0 } }, { draws: { gt: 0 } }] },
          })
        : this.db.user.count(),
    ])
    const topCards = await this.topCards(
      rows.map((row) => row.userId),
      locale,
    )
    const trainers: PvpBoardTrainer[] = rows.map((row) => ({
      ...row,
      avatarUrl: row.avatarUrl ?? undefined,
      rank: Number(row.rank),
      topCards: topCards.get(row.userId) ?? [],
    }))
    return { trainers, total, page, pageSize }
  }

  private async topCards(userIds: string[], locale: SupportedLocale) {
    const result = new Map<string, PvpCardRecord[]>()
    if (!userIds.length) return result
    const rows = await this.db.$queryRaw<RankedCardStat[]>`
      SELECT user_id AS "userId", card_id AS "cardId", wins, losses, draws FROM (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY wins DESC, (wins + losses + draws) DESC, card_id) AS position
        FROM pvp_card_stats WHERE user_id IN (${Prisma.join(userIds)})
      ) ranked WHERE position <= 3 ORDER BY user_id, position
    `
    const cards = await this.db.pokemonCard.findMany({
      where: { id: { in: rows.map((row) => row.cardId) } },
    })
    const catalog = new Map<string, PokemonCard>(cards.map((card) => [card.id, card]))
    for (const row of rows) {
      const card = catalog.get(row.cardId)
      if (!card) continue
      const entries = result.get(row.userId) ?? []
      entries.push({
        card: toCardSummary(card, undefined, locale),
        wins: row.wins,
        losses: row.losses,
        draws: row.draws,
      })
      result.set(row.userId, entries)
    }
    return result
  }
}

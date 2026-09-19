import type { Prisma, PvpMatch, PvpRating, PvpResult, User } from '@prisma/client'
import {
  PVP_RULES,
  type PvpCardFilters,
  type PvpChoice,
  type PvpLobbyResponse,
  type PvpMatchView,
  type PvpTeamSelection,
  type PvpTrainer,
  type PvpTrainerDetail,
  type SupportedLocale,
} from '@tcg-collection/shared'
import type { AppPrisma } from '../db/prisma'
import {
  battleForPlayer,
  commitChoice,
  createBattle,
  readBattle,
  type BattleSide,
  type BattleState,
} from './pvp-battle'
import { PvpError } from './pvp-error'
import { PvpRepository } from './pvp-repository'
import { eloDelta } from './pvp-rules'

const INVITATION_MS = PVP_RULES.invitationMinutes * 60 * 1000 // Ten minutes to accept a challenge.
const ROUND_MS = PVP_RULES.roundSeconds * 1000 // Ninety seconds to seal both choices, including the reveal.
const matchInclude = {
  challenger: { include: { pvpRating: true } },
  opponent: { include: { pvpRating: true } },
  results: true,
} as const
type TrainerRow = User & { pvpRating: PvpRating | null }
type MatchRecord = PvpMatch & { challenger: TrainerRow; opponent: TrainerRow; results: PvpResult[] }

function trainerView(user: TrainerRow): PvpTrainer {
  return {
    userId: user.id,
    name: user.displayName ?? user.pseudo,
    avatarUrl: user.avatarUrl ?? undefined,
    elo: user.pvpRating?.elo ?? PVP_RULES.initialElo,
    wins: user.pvpRating?.wins ?? 0,
    losses: user.pvpRating?.losses ?? 0,
    draws: user.pvpRating?.draws ?? 0,
  }
}

function view(match: MatchRecord, userId: string, locale: SupportedLocale): PvpMatchView {
  const state = readBattle(match.stateJson)
  // Names and images are localized from the immutable team snapshot, not a new catalog fetch.
  for (const player of [state.challenger, state.opponent]) {
    for (const card of player.team) {
      card.name = (locale === 'fr' ? card.nameFr : card.nameEn) ?? card.name
      card.imageSmall = card.imageSmall?.replace(
        '://assets.tcgdex.net/en/',
        `://assets.tcgdex.net/${locale}/`,
      )
      card.imageLarge = card.imageLarge?.replace(
        '://assets.tcgdex.net/en/',
        `://assets.tcgdex.net/${locale}/`,
      )
    }
  }
  for (const round of state.rounds) {
    for (const side of ['challenger', 'opponent'] as const) {
      const card = state[side].team.find((card) => card.id === round[side].card.id)
      if (card) round[side].card = card
    }
  }
  const side = userId === match.challengerId ? 'challenger' : 'opponent'
  const result = match.results.find((entry) => entry.userId === userId)
  return {
    id: match.id,
    status: match.status,
    challenger: trainerView(match.challenger),
    opponent: trainerView(match.opponent),
    ...battleForPlayer(state, side),
    eloChange: result ? result.eloAfter - result.eloBefore : null,
    expiresAt: match.expiresAt.toISOString(),
    createdAt: match.createdAt.toISOString(),
  }
}

async function lockMatch(tx: Prisma.TransactionClient, id: string, userId: string) {
  await tx.$queryRaw`SELECT id FROM pvp_matches WHERE id = ${id} AND (challenger_id = ${userId} OR opponent_id = ${userId}) FOR UPDATE`
  const match = await tx.pvpMatch.findFirst({
    where: { id, OR: [{ challengerId: userId }, { opponentId: userId }] },
    include: matchInclude,
  })
  if (!match) throw new PvpError('pvp_not_found')
  return match
}

export class PvpService {
  constructor(private readonly db: AppPrisma) {}

  async cards(
    userId: string,
    locale: SupportedLocale,
    page = 1,
    search = '',
    filters: PvpCardFilters = {},
  ) {
    return new PvpRepository(this.db).cards(userId, locale, page, search, filters)
  }

  async board(locale: SupportedLocale, page = 1) {
    return new PvpRepository(this.db).board(locale, page)
  }

  async trainer(userId: string, locale: SupportedLocale): Promise<PvpTrainerDetail> {
    const board = await new PvpRepository(this.db).board(locale, 1, userId)
    const trainer = board.trainers[0]
    if (!trainer) throw new PvpError('pvp_not_found')
    const rows = await this.db.pvpResult.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { matchId: 'desc' }],
      take: 10,
    })
    return {
      trainer,
      history: rows.reverse().map((row) => ({
        matchId: row.matchId,
        elo: row.eloAfter,
        change: row.eloAfter - row.eloBefore,
        playedAt: row.createdAt.toISOString(),
      })),
    }
  }

  async lobby(userId: string, locale: SupportedLocale): Promise<PvpLobbyResponse> {
    await this.expireFor(userId)
    const participant = { OR: [{ challengerId: userId }, { opponentId: userId }] }
    const [active, recent] = await Promise.all([
      this.db.pvpMatch.findMany({
        where: { ...participant, status: { in: ['waiting', 'active'] } },
        include: matchInclude,
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.db.pvpMatch.findMany({
        where: { ...participant, status: { in: ['completed', 'cancelled'] } },
        include: matchInclude,
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
    ])
    return { matches: [...active, ...recent].map((match) => view(match, userId, locale)) }
  }

  async create(
    userId: string,
    opponentId: string,
    selection: PvpTeamSelection[],
    locale: SupportedLocale,
  ) {
    if (userId === opponentId) throw new PvpError('pvp_self_challenge')
    await this.expireFor(userId)
    await this.expireFor(opponentId)
    return this.db.$transaction(async (tx) => {
      const repo = new PvpRepository(tx)
      await repo.lockPlayers([userId, opponentId])
      if (!(await tx.user.findUnique({ where: { id: opponentId } })))
        throw new PvpError('pvp_not_found')
      const occupied = await tx.pvpSeat.count({ where: { userId: { in: [userId, opponentId] } } })
      const invitations = await tx.pvpMatch.count({ where: { opponentId, status: 'waiting' } })
      if (occupied || invitations >= 10) throw new PvpError('pvp_busy')
      const team = await repo.team(userId, selection)
      const match = await tx.pvpMatch.create({
        data: {
          id: crypto.randomUUID(),
          challengerId: userId,
          opponentId,
          stateJson: JSON.stringify(createBattle(team)),
          expiresAt: new Date(Date.now() + INVITATION_MS),
          seats: { create: { userId } },
        },
        include: matchInclude,
      })
      return view(match, userId, locale)
    })
  }

  async get(userId: string, id: string, locale: SupportedLocale) {
    return this.db.$transaction(async (tx) => {
      const match = await lockMatch(tx, id, userId)
      await this.expire(tx, match)
      const fresh = await tx.pvpMatch.findUniqueOrThrow({ where: { id }, include: matchInclude })
      return view(fresh, userId, locale)
    })
  }

  async accept(userId: string, id: string, selection: PvpTeamSelection[], locale: SupportedLocale) {
    await this.expireFor(userId)
    return this.db.$transaction(async (tx) => {
      const match = await lockMatch(tx, id, userId)
      if (match.opponentId !== userId) throw new PvpError('pvp_forbidden')
      // A lost response can safely be retried after acceptance.
      if (match.status === 'active') return view(match, userId, locale)
      if (match.status !== 'waiting' || match.expiresAt.getTime() <= Date.now())
        throw new PvpError('pvp_closed')
      const repo = new PvpRepository(tx)
      await repo.lockPlayers([userId])
      if (await tx.pvpSeat.findUnique({ where: { userId } })) throw new PvpError('pvp_busy')
      const state = readBattle(match.stateJson)
      state.opponent.team = await repo.team(userId, selection)
      await tx.pvpSeat.create({ data: { userId, matchId: id } })
      const fresh = await tx.pvpMatch.update({
        where: { id },
        data: {
          status: 'active',
          stateJson: JSON.stringify(state),
          expiresAt: new Date(Date.now() + ROUND_MS),
        },
        include: matchInclude,
      })
      return view(fresh, userId, locale)
    })
  }

  async choose(userId: string, id: string, choice: PvpChoice, locale: SupportedLocale) {
    // Persist timeout settlement before rejecting a late command.
    await this.get(userId, id, locale)
    return this.db.$transaction(async (tx) => {
      const match = await lockMatch(tx, id, userId)
      const state = readBattle(match.stateJson)
      const side = userId === match.challengerId ? 'challenger' : 'opponent'
      if (match.status === 'waiting' || match.status === 'cancelled')
        throw new PvpError('pvp_closed')
      if (match.status === 'active' && match.expiresAt.getTime() <= Date.now())
        throw new PvpError('pvp_closed')
      const changed = commitChoice(state, side, choice, match.challengerId, match.opponentId)
      if (!changed) return view(match, userId, locale)
      if (state.reason) await this.settle(tx, match, state)
      else {
        const resolved = state.rounds.length > readBattle(match.stateJson).rounds.length
        await tx.pvpMatch.update({
          where: { id },
          data: {
            stateJson: JSON.stringify(state),
            expiresAt: resolved ? new Date(Date.now() + ROUND_MS) : match.expiresAt,
          },
        })
      }
      const fresh = await tx.pvpMatch.findUniqueOrThrow({ where: { id }, include: matchInclude })
      return view(fresh, userId, locale)
    })
  }

  async leave(userId: string, id: string, locale: SupportedLocale) {
    return this.db.$transaction(async (tx) => {
      const match = await lockMatch(tx, id, userId)
      if (await this.expire(tx, match)) {
        const fresh = await tx.pvpMatch.findUniqueOrThrow({ where: { id }, include: matchInclude })
        return view(fresh, userId, locale)
      }
      if (match.status === 'completed' || match.status === 'cancelled')
        return view(match, userId, locale)
      const state = readBattle(match.stateJson)
      if (match.status === 'waiting') state.reason = 'cancelled'
      else {
        state.reason = 'forfeit'
        state.winnerId = userId === match.challengerId ? match.opponentId : match.challengerId
      }
      await this.settle(tx, match, state)
      const fresh = await tx.pvpMatch.findUniqueOrThrow({ where: { id }, include: matchInclude })
      return view(fresh, userId, locale)
    })
  }

  private async expireFor(userId: string) {
    const rows = await this.db.pvpMatch.findMany({
      where: {
        OR: [{ challengerId: userId }, { opponentId: userId }],
        status: { in: ['waiting', 'active'] },
        expiresAt: { lte: new Date() },
      },
      select: { id: true },
      take: 20,
    })
    for (const row of rows) {
      await this.db.$transaction(async (tx) => {
        const match = await lockMatch(tx, row.id, userId)
        await this.expire(tx, match)
      })
    }
  }

  private async expire(tx: Prisma.TransactionClient, match: MatchRecord) {
    if (match.status !== 'waiting' && match.status !== 'active') return false
    if (match.expiresAt.getTime() > Date.now()) return false
    const state = readBattle(match.stateJson)
    state.reason = 'cancelled'
    if (match.status === 'active' && (state.challenger.choice || state.opponent.choice)) {
      state.reason = 'timeout'
      state.winnerId = state.challenger.choice ? match.challengerId : match.opponentId
    }
    await this.settle(tx, match, state)
    return true
  }

  private async settle(tx: Prisma.TransactionClient, match: MatchRecord, state: BattleState) {
    const cancelled = state.reason === 'cancelled'
    await tx.pvpMatch.update({
      where: { id: match.id },
      data: { status: cancelled ? 'cancelled' : 'completed', stateJson: JSON.stringify(state) },
    })
    await tx.pvpSeat.deleteMany({ where: { matchId: match.id } })
    if (cancelled) return
    const repo = new PvpRepository(tx)
    await repo.lockPlayers([match.challengerId, match.opponentId])
    const first = await tx.pvpRating.upsert({
      where: { userId: match.challengerId },
      create: { userId: match.challengerId },
      update: {},
    })
    const second = await tx.pvpRating.upsert({
      where: { userId: match.opponentId },
      create: { userId: match.opponentId },
      update: {},
    })
    let score = 0.5
    if (state.winnerId) score = Number(state.winnerId === match.challengerId)
    const delta = Math.min(second.elo, Math.max(-first.elo, eloDelta(first.elo, second.elo, score)))
    const players: { id: string; side: BattleSide; rating: PvpRating; change: number }[] = [
      { id: match.challengerId, side: 'challenger', rating: first, change: delta },
      { id: match.opponentId, side: 'opponent', rating: second, change: -delta },
    ]
    for (const player of players) {
      const wins = Number(state.winnerId === player.id),
        draws = Number(state.winnerId === null),
        losses = 1 - wins - draws
      await tx.pvpRating.update({
        where: { userId: player.id },
        data: {
          elo: { increment: player.change },
          wins: { increment: wins },
          losses: { increment: losses },
          draws: { increment: draws },
        },
      })
      await tx.pvpResult.create({
        data: {
          matchId: match.id,
          userId: player.id,
          eloBefore: player.rating.elo,
          eloAfter: player.rating.elo + player.change,
        },
      })
      for (const round of state.rounds) {
        const cardId = round[player.side].card.id,
          wins = Number(round.winnerId === player.id),
          draws = Number(round.winnerId === null),
          losses = 1 - wins - draws
        await tx.pvpCardStat.upsert({
          where: { userId_cardId: { userId: player.id, cardId } },
          create: { userId: player.id, cardId, wins, losses, draws },
          update: {
            wins: { increment: wins },
            losses: { increment: losses },
            draws: { increment: draws },
          },
        })
      }
    }
  }
}

import { PVP_RULES, type CombatCard, type PvpTeamSelection } from '@tcg-collection/shared'
import type { AppPrisma } from '../db/prisma'
import { commitChoice, createBattle } from '../pvp/pvp-battle'
import { PvpRepository } from '../pvp/pvp-repository'
import { eloDelta } from '../pvp/pvp-rules'

const HISTORY_PREFIX = 'pvp-demo-history-v1-'
const DAY_MS = 24 * 60 * 60 * 1000
const pairings = [
  [
    [0, 5],
    [1, 4],
    [2, 3],
  ],
  [
    [0, 4],
    [5, 3],
    [1, 2],
  ],
  [
    [0, 3],
    [4, 2],
    [5, 1],
  ],
  [
    [0, 2],
    [3, 1],
    [4, 5],
  ],
  [
    [0, 1],
    [2, 5],
    [3, 4],
  ],
] as const

// Backfill before the first real match without rewriting current ratings or existing results.
// The bounded inverse uses the live Elo rule, so every synthetic result is a valid transfer.
function previousRatings(firstAfter: number, secondAfter: number, score: number) {
  for (let delta = -PVP_RULES.eloK; delta <= PVP_RULES.eloK; delta++) {
    const first = firstAfter - delta
    const second = secondAfter + delta
    if (first < 0 || second < 0) continue
    const actual = Math.min(second, Math.max(-first, eloDelta(first, second, score)))
    if (actual === delta) return { first, second }
  }
  throw new Error('Unable to backfill a valid Elo transfer; existing ratings were preserved')
}

function completedBattle(team: CombatCard[], first: string, second: string, score: number) {
  const state = createBattle(team)
  state.opponent.team = team
  for (let index = 0; index < team.length && !state.reason; index++) {
    const choice = { round: index + 1, cardId: team[index]!.id, energy: 0 }
    const winningEnergy = index === 0 ? 3 : 2
    commitChoice(
      state,
      'challenger',
      { ...choice, energy: score === 1 ? winningEnergy : 0 },
      first,
      second,
    )
    commitChoice(
      state,
      'opponent',
      { ...choice, energy: score === 0 ? winningEnergy : 0 },
      first,
      second,
    )
  }
  return state
}

export async function seedPvpDemoHistory(
  db: AppPrisma,
  userIds: string[],
  selection: PvpTeamSelection[],
) {
  if (userIds.length !== 6) throw new Error('The PvP history scenario requires six demo trainers')
  const scenarioPrefix = `${HISTORY_PREFIX}${userIds[0]}-`
  return db.$transaction(async (tx) => {
    const repo = new PvpRepository(tx)
    await repo.lockPlayers(userIds)
    const existing = await tx.pvpMatch.count({ where: { id: { startsWith: scenarioPrefix } } })
    if (existing === 30) return 0
    if (existing !== 0)
      throw new Error('Incomplete demo history; use --cleanup-history before reseeding')
    const ratings = await tx.pvpRating.findMany({ where: { userId: { in: userIds } } })
    const earliestResults = await tx.pvpResult.findMany({
      where: { userId: { in: userIds } },
      orderBy: [{ createdAt: 'asc' }, { matchId: 'asc' }],
      distinct: ['userId'],
    })
    const historyEnd = Math.min(
      Date.now(),
      ...earliestResults.map((row) => row.createdAt.getTime()),
    )
    const endDay = Math.floor(historyEnd / DAY_MS) * DAY_MS
    const nextRatings = new Map(
      userIds.map((userId) => {
        const first = earliestResults.find((row) => row.userId === userId)
        const current = ratings.find((row) => row.userId === userId)
        if (!current) throw new Error('Seed demo ratings before their history')
        return [userId, first?.eloBefore ?? current.elo]
      }),
    )
    const team = await repo.team(userIds[0]!, selection)
    for (let day = 9; day >= 0; day--) {
      const date = new Date(endDay - (10 - day) * DAY_MS + 12 * 60 * 60 * 1000)
      for (const [position, [firstIndex, secondIndex]] of pairings[
        day % pairings.length
      ]!.entries()) {
        const firstId = userIds[firstIndex]!
        const secondId = userIds[secondIndex]!
        const firstAfter = nextRatings.get(firstId)!
        const secondAfter = nextRatings.get(secondId)!
        const score = [1, 0, 1, 0.5, 0][(day + position) % 5]!
        const before = previousRatings(firstAfter, secondAfter, score)
        const state = completedBattle(team, firstId, secondId, score)
        await tx.pvpMatch.create({
          data: {
            id: `${scenarioPrefix}${String(day + 1).padStart(2, '0')}-${position + 1}`,
            challengerId: firstId,
            opponentId: secondId,
            status: 'completed',
            stateJson: JSON.stringify(state),
            createdAt: date,
            updatedAt: date,
            expiresAt: date,
            results: {
              create: [
                { userId: firstId, eloBefore: before.first, eloAfter: firstAfter, createdAt: date },
                {
                  userId: secondId,
                  eloBefore: before.second,
                  eloAfter: secondAfter,
                  createdAt: date,
                },
              ],
            },
          },
        })
        nextRatings.set(firstId, before.first)
        nextRatings.set(secondId, before.second)
      }
    }
    return 30
  })
}

export async function cleanupPvpDemoHistory(db: AppPrisma) {
  return db.pvpMatch.deleteMany({ where: { id: { startsWith: HISTORY_PREFIX } } })
}

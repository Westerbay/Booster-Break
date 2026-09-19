import { z } from 'zod'
import {
  PVP_RULES,
  type CombatCard,
  type CombatTraits,
  type PvpRound,
} from '@tcg-collection/shared'
import { PvpError } from './pvp-error'

const catalogTraits = z.object({
  category: z.literal('Pokemon'),
  hp: z.number().int().positive().max(1000),
  types: z.array(z.string()).min(1),
  weaknesses: z.array(z.object({ type: z.string() })).optional(),
})

export function readCombatTraits(rawJson: string): CombatTraits | null {
  let raw: unknown
  try {
    raw = JSON.parse(rawJson)
  } catch {
    return null
  }
  const result = catalogTraits.safeParse(raw)
  if (!result.success) return null
  const card = result.data
  let power = 1
  if (card.hp > PVP_RULES.mediumPowerMaxHp) power = 3
  else if (card.hp > PVP_RULES.lowPowerMaxHp) power = 2
  return {
    hp: card.hp,
    power,
    types: card.types,
    weaknesses: card.weaknesses?.map((weakness) => weakness.type) ?? [],
  }
}

export function validateTeam(team: CombatCard[]) {
  const unique = new Set(team.map((card) => card.id))
  const power = team.reduce((sum, card) => sum + card.power, 0)
  if (
    team.length !== PVP_RULES.teamSize ||
    unique.size !== PVP_RULES.teamSize ||
    power > PVP_RULES.teamBudget
  ) {
    throw new PvpError('pvp_invalid_team')
  }
}

export function resolveRound(
  number: number,
  challengerId: string,
  challengerCard: CombatCard,
  challengerEnergy: number,
  opponentId: string,
  opponentCard: CombatCard,
  opponentEnergy: number,
): PvpRound {
  const challengerBonus = Number(
    challengerCard.types.some((type) => opponentCard.weaknesses.includes(type)),
  )
  const opponentBonus = Number(
    opponentCard.types.some((type) => challengerCard.weaknesses.includes(type)),
  )
  const challenger = {
    card: challengerCard,
    energy: challengerEnergy,
    typeBonus: challengerBonus,
    strength: challengerCard.power + challengerEnergy + challengerBonus,
  }
  const opponent = {
    card: opponentCard,
    energy: opponentEnergy,
    typeBonus: opponentBonus,
    strength: opponentCard.power + opponentEnergy + opponentBonus,
  }
  let winnerId = null
  if (challenger.strength > opponent.strength) winnerId = challengerId
  else if (opponent.strength > challenger.strength) winnerId = opponentId
  return { number, challenger, opponent, winnerId }
}

export function eloDelta(rating: number, opponentRating: number, score: number) {
  const expected = 1 / (1 + 10 ** ((opponentRating - rating) / 400))
  return Math.round(PVP_RULES.eloK * (score - expected))
}

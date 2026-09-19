import { z } from 'zod'
import { PVP_RULES, type CombatCard, type PvpChoice } from '@tcg-collection/shared'
import { PvpError } from './pvp-error'
import { resolveRound } from './pvp-rules'

const cardSchema = z.object({
  id: z.string(),
  setId: z.string(),
  number: z.string(),
  name: z.string(),
  nameEn: z.string().optional(),
  nameFr: z.string().optional(),
  finish: z.enum(['normal', 'holo', 'reverse_holo']),
  imageSmall: z.string().optional(),
  imageLarge: z.string().optional(),
  rarity: z.string().optional(),
  supertype: z.string().optional(),
  isEvolved: z.boolean().optional(),
  hp: z.number(),
  power: z.number(),
  types: z.array(z.string()),
  weaknesses: z.array(z.string()),
})
const choiceSchema = z.object({
  round: z.number().int(),
  cardId: z.string(),
  energy: z.number().int(),
})
const sideSchema = z.object({
  card: cardSchema,
  energy: z.number(),
  typeBonus: z.number(),
  strength: z.number(),
})
const playerSchema = z.object({ team: z.array(cardSchema), choice: choiceSchema.nullable() })
const battleSchema = z.object({
  version: z.literal(1),
  challenger: playerSchema,
  opponent: playerSchema,
  rounds: z.array(
    z.object({
      number: z.number(),
      challenger: sideSchema,
      opponent: sideSchema,
      winnerId: z.string().nullable(),
    }),
  ),
  winnerId: z.string().nullable(),
  reason: z.enum(['rounds', 'forfeit', 'timeout', 'cancelled']).nullable(),
})

export type BattleState = z.infer<typeof battleSchema>
export type BattleSide = 'challenger' | 'opponent'

export function createBattle(team: CombatCard[]): BattleState {
  return {
    version: PVP_RULES.version,
    challenger: { team, choice: null },
    opponent: { team: [], choice: null },
    rounds: [],
    winnerId: null,
    reason: null,
  }
}

export function readBattle(stateJson: string): BattleState {
  return battleSchema.parse(JSON.parse(stateJson))
}

function spentEnergy(state: BattleState, side: BattleSide) {
  return state.rounds.reduce((sum, round) => sum + round[side].energy, 0)
}

export function battleForPlayer(state: BattleState, side: BattleSide) {
  const opponentSide = side === 'challenger' ? 'opponent' : 'challenger'
  const choice = state[side].choice
  return {
    team: state[side].team,
    choice,
    opponentReady: state[opponentSide].choice !== null,
    energyRemaining: PVP_RULES.energy - spentEnergy(state, side) - (choice?.energy ?? 0),
    rounds: state.rounds,
    round: state.rounds.length + 1,
    winnerId: state.winnerId,
    reason: state.reason,
  }
}

// Returns false for an exact replay. The service holds the match lock while applying this.
export function commitChoice(
  state: BattleState,
  side: BattleSide,
  choice: PvpChoice,
  challengerId: string,
  opponentId: string,
): boolean {
  const previous = state.rounds.find((round) => round.number === choice.round)?.[side]
  if (previous?.card.id === choice.cardId && previous.energy === choice.energy) return false
  if (state.reason) throw new PvpError('pvp_closed')
  if (choice.round !== state.rounds.length + 1) throw new PvpError('pvp_invalid_choice')
  const pending = state[side].choice
  if (pending) {
    if (pending.cardId === choice.cardId && pending.energy === choice.energy) return false
    throw new PvpError('pvp_choice_locked')
  }
  const card = state[side].team.find((card) => card.id === choice.cardId)
  const used = state.rounds.some((round) => round[side].card.id === choice.cardId)
  const remaining = PVP_RULES.energy - spentEnergy(state, side)
  if (
    !card ||
    used ||
    !Number.isInteger(choice.energy) ||
    choice.energy < 0 ||
    choice.energy > Math.min(remaining, PVP_RULES.maxCommitment)
  ) {
    throw new PvpError('pvp_invalid_choice')
  }
  state[side].choice = choice
  const first = state.challenger.choice
  const second = state.opponent.choice
  if (!first || !second) return true
  const firstCard = state.challenger.team.find((card) => card.id === first.cardId)
  const secondCard = state.opponent.team.find((card) => card.id === second.cardId)
  if (!firstCard || !secondCard) throw new PvpError('pvp_invalid_choice')
  state.rounds.push(
    resolveRound(
      choice.round,
      challengerId,
      firstCard,
      first.energy,
      opponentId,
      secondCard,
      second.energy,
    ),
  )
  state.challenger.choice = null
  state.opponent.choice = null
  const firstWins = state.rounds.filter((round) => round.winnerId === challengerId).length
  const secondWins = state.rounds.filter((round) => round.winnerId === opponentId).length
  if (firstWins === 2 || secondWins === 2 || state.rounds.length === PVP_RULES.rounds) {
    state.reason = 'rounds'
    if (firstWins > secondWins) state.winnerId = challengerId
    else if (secondWins > firstWins) state.winnerId = opponentId
  }
  return true
}

import type { CardFinish, PokemonCardSummary } from './index'

export const PVP_RULES = {
  version: 1,
  teamSize: 3,
  teamBudget: 6,
  energy: 5,
  maxCommitment: 3,
  rounds: 3,
  initialElo: 100,
  eloK: 24,
  lowPowerMaxHp: 100,
  mediumPowerMaxHp: 180,
  invitationMinutes: 10,
  roundSeconds: 90,
} as const

export interface CombatTraits {
  hp: number
  power: number
  types: string[]
  weaknesses: string[]
}

export interface CombatCard extends PokemonCardSummary, CombatTraits {
  finish: CardFinish
}

export interface PvpCardFilters {
  rarity?: string
  finish?: CardFinish
}

export interface PvpTeamSelection {
  cardId: string
  finish: CardFinish
}

export interface PvpChoice {
  round: number
  cardId: string
  energy: number
}

export interface PvpRoundSide {
  card: CombatCard
  energy: number
  typeBonus: number
  strength: number
}

export interface PvpRound {
  number: number
  challenger: PvpRoundSide
  opponent: PvpRoundSide
  winnerId: string | null
}

export interface PvpTrainer {
  userId: string
  name: string
  avatarUrl?: string
  elo: number
  wins: number
  losses: number
  draws: number
}

export interface PvpCardRecord {
  card: PokemonCardSummary
  wins: number
  losses: number
  draws: number
}

export interface PvpBoardTrainer extends PvpTrainer {
  rank: number
  topCards: PvpCardRecord[]
}

export interface PvpBoardResponse {
  trainers: PvpBoardTrainer[]
  total: number
  page: number
  pageSize: number
}

export interface PvpTrainerDetail {
  trainer: PvpBoardTrainer
  history: { matchId: string; elo: number; change: number; playedAt: string }[]
}

export type PvpMatchStatus = 'waiting' | 'active' | 'completed' | 'cancelled'
export type PvpFinishReason = 'rounds' | 'forfeit' | 'timeout' | 'cancelled'

export interface PvpMatchView {
  id: string
  status: PvpMatchStatus
  challenger: PvpTrainer
  opponent: PvpTrainer
  team: CombatCard[]
  choice: PvpChoice | null
  opponentReady: boolean
  energyRemaining: number
  rounds: PvpRound[]
  round: number
  winnerId: string | null
  reason: PvpFinishReason | null
  eloChange: number | null
  expiresAt: string
  createdAt: string
}

export interface PvpLobbyResponse {
  matches: PvpMatchView[]
}

export interface PvpCardsResponse {
  cards: CombatCard[]
  page: number
  hasMore: boolean
}

export type PvpErrorCode =
  | 'pvp_not_found'
  | 'pvp_forbidden'
  | 'pvp_busy'
  | 'pvp_invalid_team'
  | 'pvp_card_unavailable'
  | 'pvp_invalid_choice'
  | 'pvp_choice_locked'
  | 'pvp_closed'
  | 'pvp_self_challenge'

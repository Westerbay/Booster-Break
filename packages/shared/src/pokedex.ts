import type { PokemonCardSummary, PokemonSetSummary } from './index'

export interface PokedexSetSummary extends PokemonSetSummary {
  catalogCount: number
  discoveredCount: number
}

export interface PokedexOverviewResponse {
  sets: PokedexSetSummary[]
  totalCards: number
  discoveredCards: number
}

export interface PokedexSlot {
  card: PokemonCardSummary
  discovered: boolean
  firstObtainedAt?: string
}

export interface PokedexSetResponse {
  set: PokedexSetSummary
  slots: PokedexSlot[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pageCount: number
  }
}

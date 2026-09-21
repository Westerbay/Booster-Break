import type { PvpCardFilters } from '@tcg-collection/shared'
import { queryOptions } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import { pvpData } from '@/features/pvp/lib/api'
import { getLocale } from '@/paraglide/runtime'

export const pvpQueryKeys = {
  all: ['pvp'] as const,
  private: ['pvp', 'private'] as const,
  match: (id: string, userId: string, locale: string) =>
    ['pvp', 'private', userId, 'match', id, locale] as const,
}

export function pvpBoardOptions(page = 1, ranked = false) {
  return queryOptions({
    queryKey: ['pvp', 'board', getLocale(), page, ranked],
    queryFn: async () => pvpData(await api.pvp.board.get({ query: { page, ranked } })),
    staleTime: 10_000,
    refetchInterval: 15_000,
    meta: { suppressToast: true },
  })
}

export function pvpTrainerOptions(id: string) {
  return queryOptions({
    queryKey: ['pvp', 'trainer', id, getLocale()],
    queryFn: async () => pvpData(await api.pvp.trainers({ userId: id }).get()),
    staleTime: 10_000,
    meta: { suppressToast: true },
  })
}

export function pvpCardsOptions(
  userId: string,
  page: number,
  search: string,
  filters: PvpCardFilters = {},
) {
  return queryOptions({
    queryKey: ['pvp', 'private', userId, 'cards', getLocale(), page, search, filters],
    queryFn: async () => pvpData(await api.pvp.cards.get({ query: { page, search, ...filters } })),
    enabled: Boolean(userId),
    meta: { suppressToast: true },
  })
}

export function pvpLobbyOptions(userId: string) {
  return queryOptions({
    queryKey: ['pvp', 'private', userId, 'lobby', getLocale()],
    queryFn: async () => pvpData(await api.pvp.lobby.get()),
    enabled: Boolean(userId),
    refetchInterval: 3_000,
    meta: { suppressToast: true },
  })
}

export function pvpMatchOptions(id: string, userId: string) {
  return queryOptions({
    queryKey: pvpQueryKeys.match(id, userId, getLocale()),
    queryFn: async () => pvpData(await api.pvp.matches({ matchId: id }).get()),
    enabled: Boolean(id && userId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'completed' || status === 'cancelled' ? false : 1_500
    },
    meta: { suppressToast: true },
  })
}

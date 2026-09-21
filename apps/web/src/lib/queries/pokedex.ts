import type {
  PokedexOverviewResponse,
  PokedexSetResponse,
  SupportedLocale,
} from '@tcg-collection/shared'

import { api } from '@/lib/api-client'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { edenQueryOption } from './eden-query-option'
import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { loadPokedexBook } from '@/features/pokedex/lib/load-pokedex-book'

export const pokedexQueryKeys = {
  all: ['pokemon', 'pokedex'] as const,
  user: (userId: string | undefined) => ['pokemon', 'pokedex', userId] as const,
  overview: (userId: string | undefined, locale: SupportedLocale) =>
    ['pokemon', 'pokedex', userId, 'overview', locale] as const,
  set: (
    userId: string | undefined,
    setId: string | undefined,
    page: number,
    pageSize: number,
    locale: SupportedLocale,
  ) => ['pokemon', 'pokedex', userId, 'set', setId, page, pageSize, locale] as const,
}

export function pokedexBookQueryOptions(
  queryClient: QueryClient,
  userId: string,
  setId: string,
  enabled: boolean,
) {
  const locale = getLocale()
  return queryOptions({
    queryKey: [...pokedexQueryKeys.user(userId), 'book', setId, locale],
    enabled,
    queryFn: () =>
      loadPokedexBook((page) =>
        queryClient.fetchQuery({
          ...pokedexSetQueryOptions(userId, setId, page, 60, locale),
          staleTime: 0,
        }),
      ),
    meta: { suppressToast: true },
  })
}

export const usePokedexQueryOption = (userId: string | undefined) => {
  const locale = getLocale()

  return edenQueryOption({
    edenQuery: api.pokemon.pokedex.get,
    edenOptions: { query: { locale } },
    queryKey: pokedexQueryKeys.overview(userId, locale),
    enabled: Boolean(userId),
    mapData: (data): PokedexOverviewResponse => data,
    toError: (error) => new Error(error.value.message ?? m.api_unable_load_pokedex()),
    meta: { suppressToast: true },
  })
}

const pokedexSetQueryOptions = (
  userId: string | undefined,
  setId: string | undefined,
  page = 1,
  pageSize = 12,
  locale: SupportedLocale = getLocale(),
) => {
  return edenQueryOption({
    edenQuery: api.pokemon.pokedex.sets({ setId: setId ?? '' }).get,
    edenOptions: { query: { page, pageSize, locale } },
    queryKey: pokedexQueryKeys.set(userId, setId, page, pageSize, locale),
    enabled: Boolean(userId && setId),
    mapData: (data): PokedexSetResponse => data,
    toError: (error) => new Error(error.value.message ?? m.api_unable_load_pokedex()),
    meta: { suppressToast: true },
  })
}

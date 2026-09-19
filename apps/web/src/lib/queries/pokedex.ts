import type {
  PokedexOverviewResponse,
  PokedexSetResponse,
  SupportedLocale,
} from '@tcg-collection/shared'

import { api } from '@/lib/api-client'
import { m } from '@/paraglide/messages'
import { getLocale } from '@/paraglide/runtime'
import { edenQueryOption } from './eden-query-option'

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

export const usePokedexSetQueryOption = (
  userId: string | undefined,
  setId: string | undefined,
  page = 1,
  pageSize = 12,
) => {
  const locale = getLocale()

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

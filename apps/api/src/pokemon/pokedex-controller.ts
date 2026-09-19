import { Elysia } from 'elysia'
import { z } from 'zod'
import type { AuthService } from '../auth/auth-service'
import { createAuthRequiredPlugin } from '../auth/auth-required-plugin'
import { localePlugin, resolveLocaleOverride } from '../i18n/locale'
import { localeQuerySchema, localeSchema } from './pokemon-controller-schemas'
import type { PokedexRepository } from './pokedex-repository'

export function createPokedexController(repository: PokedexRepository, authService: AuthService) {
  return new Elysia({ prefix: '/pokedex' })
    .use(localePlugin)
    .onBeforeHandle(({ set }) => {
      set.headers['Cache-Control'] = 'no-store'
    })
    .use(createAuthRequiredPlugin({ authService }))
    .get(
      '/',
      ({ currentUser, locale, query }) =>
        repository.overview(currentUser.id, resolveLocaleOverride(query.locale, locale)),
      { query: localeQuerySchema },
    )
    .get(
      '/sets/:setId',
      async ({ currentUser, params, query, locale, status }) => {
        const result = await repository.getSet(
          currentUser.id,
          params.setId,
          query.page,
          query.pageSize,
          resolveLocaleOverride(query.locale, locale),
        )
        if (!result) {
          return status(404, { error: 'pokedex_set_not_found', message: 'Set not found.' })
        }
        return result
      },
      {
        params: z.object({ setId: z.string().min(1).max(128) }),
        query: z.object({
          page: z.coerce.number().int().min(1).max(10000).default(1),
          pageSize: z.coerce.number().int().min(1).max(60).default(12),
          locale: localeSchema.optional(),
        }),
      },
    )
}

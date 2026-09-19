import { Elysia } from 'elysia'
import { z } from 'zod'
import { PVP_RULES } from '@tcg-collection/shared'
import type { AuthService } from '../auth/auth-service'
import { createAuthRequiredPlugin } from '../auth/auth-required-plugin'
import { localePlugin } from '../i18n/locale'
import { PvpError } from './pvp-error'
import type { PvpService } from './pvp-service'

const id = z.string().min(1).max(128)
const team = z
  .array(z.object({ cardId: id, finish: z.enum(['normal', 'holo', 'reverse_holo']) }).strict())
  .length(PVP_RULES.teamSize)
const page = z.coerce.number().int().min(1).max(10000).default(1)
const matchParams = z.object({ matchId: id })

export function createPvpController(service: PvpService, authService: AuthService) {
  return new Elysia({ prefix: '/pvp' })
    .use(localePlugin)
    .onBeforeHandle(({ set }) => {
      set.headers['Cache-Control'] = 'no-store'
    })
    .onError(({ error, status }) => {
      if (!(error instanceof PvpError)) return
      let code: 404 | 403 | 409 = 409
      if (error.code === 'pvp_not_found') code = 404
      else if (error.code === 'pvp_forbidden') code = 403
      return status(code, { error: error.code, message: error.message })
    })
    .get('/board', ({ locale, query }) => service.board(locale, query.page), {
      query: z.object({ page }),
    })
    .get('/trainers/:userId', ({ locale, params }) => service.trainer(params.userId, locale), {
      params: z.object({ userId: id }),
    })
    .use(createAuthRequiredPlugin({ authService }))
    .get(
      '/cards',
      ({ currentUser, locale, query }) =>
        service.cards(currentUser.id, locale, query.page, query.search, query),
      {
        query: z.object({
          page,
          search: z.string().max(100).default(''),
          rarity: z.string().min(1).max(100).optional(),
          finish: z.enum(['normal', 'holo', 'reverse_holo']).optional(),
        }),
      },
    )
    .get('/lobby', ({ currentUser, locale }) => service.lobby(currentUser.id, locale))
    .post(
      '/matches',
      ({ currentUser, body, locale }) =>
        service.create(currentUser.id, body.opponentId, body.team, locale),
      { body: z.object({ opponentId: id, team }).strict() },
    )
    .get(
      '/matches/:matchId',
      ({ currentUser, params, locale }) => service.get(currentUser.id, params.matchId, locale),
      { params: matchParams },
    )
    .post(
      '/matches/:matchId/accept',
      ({ currentUser, params, body, locale }) =>
        service.accept(currentUser.id, params.matchId, body.team, locale),
      { params: matchParams, body: z.object({ team }).strict() },
    )
    .post(
      '/matches/:matchId/choice',
      ({ currentUser, params, body, locale }) =>
        service.choose(currentUser.id, params.matchId, body, locale),
      {
        params: matchParams,
        body: z
          .object({
            round: z.number().int().min(1).max(PVP_RULES.rounds),
            cardId: id,
            energy: z.number().int().min(0).max(PVP_RULES.maxCommitment),
          })
          .strict(),
      },
    )
    .post(
      '/matches/:matchId/leave',
      ({ currentUser, params, locale }) => service.leave(currentUser.id, params.matchId, locale),
      { params: matchParams },
    )
}

import { afterAll, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { AuthService } from '../../src/auth/auth-service'
import { MemoryAuthStore } from '../../src/auth/session-store'
import { createPvpController } from '../../src/pvp/pvp-controller'
import { PvpService } from '../../src/pvp/pvp-service'
import { eloDelta } from '../../src/pvp/pvp-rules'
import { readBattle } from '../../src/pvp/pvp-battle'
import { seedPvpDemoHistory } from '../../src/scripts/pvp-demo-history'

const databaseTest = Bun.env.RUN_DATABASE_TESTS === 'true' ? test : test.skip

async function fixture(userCount = 3) {
  const url = new URL(Bun.env.DATABASE_URL ?? 'https://invalid')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith('_test'))
    throw new Error('PvP tests require a disposable loopback _test database')
  const { prisma } = await import('../../src/db/prisma')
  const suffix = crypto.randomUUID()
  const alice = `alice-${suffix}`,
    bob = `bob-${suffix}`,
    stranger = `stranger-${suffix}`,
    setId = `pvp-${suffix}`
  const users = [
    alice,
    bob,
    stranger,
    ...Array.from({ length: userCount - 3 }, (_, index) => `demo-${index}-${suffix}`),
  ]
  const cardIds = [1, 2, 3].map((power) => `pvp-${power}-${suffix}`)
  await prisma.user.createMany({ data: users.map((id) => ({ id, pseudo: id, slackUserId: id })) })
  await prisma.pokemonSet.create({
    data: {
      id: setId,
      name: 'PvP tests',
      series: 'Tests',
      total: 3,
      releaseDate: '2026-09-19',
      rawJson: '{}',
      syncedAt: '',
      cards: {
        create: cardIds.map((id, i) => ({
          id,
          localId: String(i),
          name: id,
          category: 'Pokemon',
          rawJson: JSON.stringify({
            category: 'Pokemon',
            hp: [90, 150, 250][i],
            types: ['Colorless'],
          }),
          syncedAt: '',
        })),
      },
    },
  })
  await prisma.userCard.createMany({
    data: users.flatMap((userId) =>
      cardIds.map((cardId) => ({
        userId,
        cardId,
        finish: 'normal',
        quantity: 1,
        firstCollectedAt: new Date(),
        updatedAt: new Date(),
      })),
    ),
  })
  const team = cardIds.map((cardId) => ({ cardId, finish: 'normal' as const }))
  return {
    prisma,
    service: new PvpService(prisma),
    alice,
    bob,
    stranger,
    team,
    cardIds,
    users,
    cleanup: async () => {
      await prisma.user.deleteMany({ where: { id: { in: users } } })
      await prisma.pokemonSet.delete({ where: { id: setId } })
    },
  }
}

databaseTest(
  'a private simultaneous duel settles exactly once, including card records and Elo',
  async () => {
    const f = await fixture()
    try {
      const match = await f.service.create(f.alice, f.bob, f.team, 'en')
      expect((await f.service.get(f.bob, match.id, 'en')).team).toEqual([])
      await expect(f.service.get(f.stranger, match.id, 'en')).rejects.toThrow('pvp_not_found')
      await f.service.accept(f.bob, match.id, f.team, 'en')
      const first = { round: 1, cardId: f.cardIds[2]!, energy: 3 }
      await Promise.all([
        f.service.choose(f.alice, match.id, first, 'en'),
        f.service.choose(f.alice, match.id, first, 'en'),
      ])
      expect((await f.service.get(f.bob, match.id, 'en')).rounds).toEqual([])
      await f.service.choose(f.bob, match.id, { round: 1, cardId: f.cardIds[0]!, energy: 0 }, 'en')
      await f.service.choose(
        f.alice,
        match.id,
        { round: 2, cardId: f.cardIds[1]!, energy: 2 },
        'en',
      )
      const last = { round: 2, cardId: f.cardIds[1]!, energy: 0 }
      const results = await Promise.all([
        f.service.choose(f.bob, match.id, last, 'en'),
        f.service.choose(f.bob, match.id, last, 'en'),
      ])
      expect(results.every((result) => result.status === 'completed')).toBe(true)
      const profile = await f.service.trainer(f.alice, 'en')
      expect(profile.trainer).toMatchObject({ elo: 112, wins: 1, losses: 0, draws: 0 })
      expect(profile.trainer.topCards.map((record) => record.wins)).toEqual([1, 1])
      expect(profile.history).toHaveLength(1)
      expect((await f.service.trainer(f.bob, 'en')).trainer).toMatchObject({ elo: 88, losses: 1 })
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest('the Elo ranking hides trainers who have never battled', async () => {
  const f = await fixture(4)
  try {
    const idle = f.users[3]!
    await f.prisma.pvpRating.createMany({
      data: [
        { userId: f.alice, elo: 112, wins: 1 },
        { userId: f.bob, elo: 88, losses: 1 },
        { userId: idle, elo: 100 },
      ],
    })
    const ranking = await f.service.board('en', 1, true)
    expect(ranking.trainers.map(({ userId, rank }) => ({ userId, rank }))).toEqual([
      { userId: f.alice, rank: 1 },
      { userId: f.bob, rank: 2 },
    ])
    expect(ranking.total).toBe(2)
    const roster = await f.service.board('en')
    expect(roster.trainers.map((trainer) => trainer.userId).sort()).toEqual([...f.users].sort())
    expect(roster.trainers.slice(0, 2).map((trainer) => trainer.userId)).toEqual([f.alice, f.bob])
    expect(roster.total).toBe(4)
    expect((await f.service.trainer(f.bob, 'en')).trainer.rank).toBe(2)
    expect((await f.service.trainer(f.stranger, 'en')).trainer).toMatchObject({ elo: 100, wins: 0 })
  } finally {
    await f.cleanup()
  }
})

afterAll(async () => {
  if (Bun.env.RUN_DATABASE_TESTS === 'true') {
    const { prisma } = await import('../../src/db/prisma')
    await prisma.$disconnect()
  }
})

databaseTest(
  'competing challenges reserve only one seat; invalid teams leave no match behind',
  async () => {
    const f = await fixture()
    try {
      await expect(
        f.service.create(f.alice, f.bob, [f.team[0]!, f.team[0]!, f.team[2]!], 'en'),
      ).rejects.toThrow('pvp_invalid_team')
      expect(await f.prisma.pvpSeat.count({ where: { userId: f.alice } })).toBe(0)
      const attempts = await Promise.allSettled([
        f.service.create(f.alice, f.bob, f.team, 'en'),
        f.service.create(f.alice, f.stranger, f.team, 'en'),
      ])
      expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1)
      expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1)
      expect(await f.prisma.pvpMatch.count({ where: { challengerId: f.alice } })).toBe(1)
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest('ownership and finish are checked for both players, including gifts', async () => {
  const f = await fixture()
  try {
    const match = await f.service.create(f.alice, f.bob, f.team, 'en')
    await f.prisma.userCard.delete({
      where: { userId_cardId_finish: { userId: f.bob, cardId: f.cardIds[0]!, finish: 'normal' } },
    })
    await expect(f.service.accept(f.bob, match.id, f.team, 'en')).rejects.toThrow(
      'pvp_card_unavailable',
    )
    await expect(f.service.accept(f.alice, match.id, f.team, 'en')).rejects.toThrow('pvp_forbidden')
    expect((await f.service.get(f.alice, match.id, 'en')).status).toBe('waiting')
    await f.prisma.giftedUserCard.create({
      data: {
        userId: f.bob,
        cardId: f.cardIds[0]!,
        finish: 'holo',
        quantity: 1,
        firstCollectedAt: new Date(),
        updatedAt: new Date(),
      },
    })
    await expect(f.service.accept(f.bob, match.id, f.team, 'en')).rejects.toThrow(
      'pvp_card_unavailable',
    )
    const giftedTeam = [{ ...f.team[0]!, finish: 'holo' as const }, ...f.team.slice(1)]
    const accepted = await Promise.all([
      f.service.accept(f.bob, match.id, giftedTeam, 'en'),
      f.service.accept(f.bob, match.id, giftedTeam, 'en'),
    ])
    expect(accepted.every((result) => result.status === 'active')).toBe(true)
    expect(accepted[0]!.team[0]!.power).toBe(1)
    expect(await f.prisma.pvpSeat.count({ where: { matchId: match.id } })).toBe(2)
  } finally {
    await f.cleanup()
  }
})

databaseTest(
  'three ties produce one draw and three card records, then release both players',
  async () => {
    const f = await fixture()
    try {
      const match = await f.service.create(f.alice, f.bob, f.team, 'en')
      await f.service.accept(f.bob, match.id, f.team, 'en')
      for (let index = 0; index < 3; index++) {
        const choice = { round: index + 1, cardId: f.cardIds[index]!, energy: 0 }
        await Promise.all([
          f.service.choose(f.alice, match.id, choice, 'en'),
          f.service.choose(f.bob, match.id, choice, 'en'),
        ])
      }
      const result = await f.service.get(f.alice, match.id, 'en')
      expect(result).toMatchObject({ status: 'completed', winnerId: null, eloChange: 0 })
      const profile = await f.service.trainer(f.alice, 'en')
      expect(profile.trainer).toMatchObject({ elo: 100, draws: 1 })
      expect(profile.trainer.topCards.map((entry) => entry.draws)).toEqual([1, 1, 1])
      expect(await f.prisma.pvpSeat.count({ where: { matchId: match.id } })).toBe(0)
      expect((await f.service.create(f.bob, f.alice, f.team, 'en')).status).toBe('waiting')
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest(
  'expired invitations cancel without Elo; a sealed choice wins a timeout exactly once',
  async () => {
    const f = await fixture()
    try {
      const invitation = await f.service.create(f.alice, f.bob, f.team, 'en')
      await f.prisma.pvpMatch.update({
        where: { id: invitation.id },
        data: { expiresAt: new Date(0) },
      })
      expect((await f.service.get(f.alice, invitation.id, 'en')).status).toBe('cancelled')
      expect((await f.service.trainer(f.alice, 'en')).history).toHaveLength(0)
      const match = await f.service.create(f.alice, f.bob, f.team, 'en')
      await f.service.accept(f.bob, match.id, f.team, 'en')
      await f.service.choose(
        f.alice,
        match.id,
        { round: 1, cardId: f.cardIds[0]!, energy: 0 },
        'en',
      )
      await f.prisma.pvpMatch.update({ where: { id: match.id }, data: { expiresAt: new Date(0) } })
      const results = await Promise.all([
        f.service.get(f.alice, match.id, 'en'),
        f.service.leave(f.bob, match.id, 'en'),
      ])
      expect(
        results.every((result) => result.reason === 'timeout' && result.winnerId === f.alice),
      ).toBe(true)
      expect((await f.service.trainer(f.alice, 'en')).trainer).toMatchObject({
        wins: 1,
        elo: 112,
        topCards: [],
      })
      expect(await f.prisma.pvpResult.count({ where: { matchId: match.id } })).toBe(2)
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest('forfeiting cannot award unplayed cards or be submitted by a spectator', async () => {
  const f = await fixture()
  try {
    const match = await f.service.create(f.alice, f.bob, f.team, 'en')
    await f.service.accept(f.bob, match.id, f.team, 'en')
    await expect(f.service.leave(f.stranger, match.id, 'en')).rejects.toThrow('pvp_not_found')
    await expect(
      f.service.choose(f.stranger, match.id, { round: 1, cardId: f.cardIds[0]!, energy: 3 }, 'en'),
    ).rejects.toThrow('pvp_not_found')
    const result = await f.service.leave(f.alice, match.id, 'en')
    expect(result).toMatchObject({
      status: 'completed',
      reason: 'forfeit',
      winnerId: f.bob,
      eloChange: -12,
    })
    await f.service.leave(f.alice, match.id, 'en')
    expect((await f.service.trainer(f.bob, 'en')).trainer).toMatchObject({
      wins: 1,
      elo: 112,
      topCards: [],
    })
  } finally {
    await f.cleanup()
  }
})

databaseTest(
  'HTTP routes keep the board public and validate authenticated commands before service access',
  async () => {
    const f = await fixture()
    try {
      const auth = new AuthService({ sessionCookieName: 'pvp_test', store: new MemoryAuthStore() })
      const login = await auth.loginForDevelopment({ pseudo: 'pvp-http-test' })
      if (!('sessionId' in login)) throw new Error('Test login failed')
      const app = new Elysia().use(createPvpController(f.service, auth))
      const request = (path: string, body?: unknown, authenticated = false) =>
        app.handle(
          new Request(`http://localhost/pvp${path}`, {
            method: body === undefined ? 'GET' : 'POST',
            headers: {
              'content-type': 'application/json',
              ...(authenticated ? { Cookie: `pvp_test=${login.sessionId}` } : {}),
            },
            body: body === undefined ? undefined : JSON.stringify(body),
          }),
        )
      expect((await request('/board')).status).toBe(200)
      expect((await request('/board?page=-1')).status).toBe(422)
      expect((await request('/board?ranked=true')).status).toBe(200)
      expect((await request('/board?ranked=maybe')).status).toBe(422)
      for (const path of ['/lobby', '/cards', '/matches/private'])
        expect((await request(path)).status).toBe(401)
      expect((await request('/matches', { opponentId: f.bob, team: f.team })).status).toBe(401)
      expect((await request('/matches/private', undefined, true)).status).toBe(404)
      for (const body of [
        { round: 1, cardId: f.cardIds[0], energy: 4 },
        { round: 1, cardId: f.cardIds[0], energy: 1, power: 99 },
        { round: 1, cardId: f.cardIds[0], energy: -1 },
      ])
        expect((await request('/matches/private/choice', body, true)).status).toBe(422)
      expect(await f.prisma.pvpMatch.count({ where: { challengerId: f.alice } })).toBe(0)
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest('accepting simultaneous invitations only starts one duel', async () => {
  const f = await fixture()
  try {
    const first = await f.service.create(f.alice, f.bob, f.team, 'en')
    const second = await f.service.create(f.stranger, f.bob, f.team, 'en')
    const attempts = await Promise.allSettled([
      f.service.accept(f.bob, first.id, f.team, 'en'),
      f.service.accept(f.bob, second.id, f.team, 'en'),
    ])
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await f.prisma.pvpMatch.count({ where: { opponentId: f.bob, status: 'active' } })).toBe(
      1,
    )
    expect(await f.prisma.pvpSeat.count({ where: { userId: f.bob } })).toBe(1)
  } finally {
    await f.cleanup()
  }
})

databaseTest(
  'a failed card-stat write rolls back the final choice, Elo and match result together',
  async () => {
    const f = await fixture()
    try {
      const match = await f.service.create(f.alice, f.bob, f.team, 'en')
      await f.service.accept(f.bob, match.id, f.team, 'en')
      await f.service.choose(
        f.alice,
        match.id,
        { round: 1, cardId: f.cardIds[2]!, energy: 3 },
        'en',
      )
      await f.service.choose(f.bob, match.id, { round: 1, cardId: f.cardIds[0]!, energy: 0 }, 'en')
      await f.service.choose(
        f.alice,
        match.id,
        { round: 2, cardId: f.cardIds[1]!, energy: 2 },
        'en',
      )
      // Remove only this fixture's catalog row to induce a real foreign-key failure
      // at card-stat settlement, after the result and rating writes have happened.
      await f.prisma.pokemonCard.delete({ where: { id: f.cardIds[2]! } })
      await expect(
        f.service.choose(f.bob, match.id, { round: 2, cardId: f.cardIds[1]!, energy: 0 }, 'en'),
      ).rejects.toThrow()
      expect(await f.prisma.pvpResult.count({ where: { matchId: match.id } })).toBe(0)
      expect(await f.prisma.pvpRating.count({ where: { userId: { in: [f.alice, f.bob] } } })).toBe(
        0,
      )
      expect(await f.prisma.pvpSeat.count({ where: { matchId: match.id } })).toBe(2)
      const state = await f.service.get(f.bob, match.id, 'en')
      expect(state).toMatchObject({ status: 'active', round: 2, choice: null, opponentReady: true })
      expect(state.rounds).toHaveLength(1)
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest('an idle active match cancels without ratings and releases its seats', async () => {
  const f = await fixture()
  try {
    const match = await f.service.create(f.alice, f.bob, f.team, 'en')
    await f.service.accept(f.bob, match.id, f.team, 'en')
    await f.prisma.pvpMatch.update({ where: { id: match.id }, data: { expiresAt: new Date(0) } })
    const result = await f.service.get(f.bob, match.id, 'en')
    expect(result).toMatchObject({
      status: 'cancelled',
      reason: 'cancelled',
      winnerId: null,
      eloChange: null,
    })
    expect(await f.prisma.pvpSeat.count({ where: { matchId: match.id } })).toBe(0)
    expect((await f.service.trainer(f.alice, 'en')).trainer).toMatchObject({
      elo: 100,
      wins: 0,
      losses: 0,
      draws: 0,
      topCards: [],
    })
  } finally {
    await f.cleanup()
  }
})

databaseTest(
  'card selection combines search, rarity and owned finish filters before pagination',
  async () => {
    const f = await fixture()
    try {
      await f.prisma.pokemonCard.update({ where: { id: f.cardIds[1] }, data: { rarity: 'Rare' } })
      await f.prisma.giftedUserCard.create({
        data: {
          userId: f.alice,
          cardId: f.cardIds[1]!,
          finish: 'holo',
          quantity: 1,
          firstCollectedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      const result = await f.service.cards(f.alice, 'en', 1, 'pvp', {
        rarity: 'Rare',
        finish: 'holo',
      })
      expect(result.cards.map((card) => [card.id, card.finish])).toEqual([[f.cardIds[1], 'holo']])
      expect(
        (await f.service.cards(f.bob, 'en', 1, '', { rarity: 'Rare', finish: 'holo' })).cards,
      ).toEqual([])
      expect(
        (await f.service.cards(f.alice, 'en', 1, 'no match', { rarity: 'Rare', finish: 'holo' }))
          .cards,
      ).toEqual([])
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest(
  'Elo rewards an upset more than an expected win and remains zero-sum at the floor',
  async () => {
    const f = await fixture()
    try {
      for (const scenario of [
        { alice: 1000, bob: 1600, winner: f.alice, expected: 23 },
        { alice: 1600, bob: 1000, winner: f.alice, expected: 1 },
        { alice: 0, bob: 0, winner: f.bob, expected: 0 },
        { alice: 5, bob: 0, winner: f.bob, expected: -5 },
        { alice: 0, bob: 5, winner: f.alice, expected: 5 },
      ]) {
        for (const [userId, elo] of [
          [f.alice, scenario.alice],
          [f.bob, scenario.bob],
        ] as const) {
          await f.prisma.pvpRating.upsert({
            where: { userId },
            create: { userId, elo },
            update: { elo },
          })
        }
        const match = await f.service.create(f.alice, f.bob, f.team, 'en')
        await f.service.accept(f.bob, match.id, f.team, 'en')
        const loser = scenario.winner === f.alice ? f.bob : f.alice
        await Promise.all([
          f.service.leave(loser, match.id, 'en'),
          f.service.leave(loser, match.id, 'en'),
        ])
        const alice = await f.service.trainer(f.alice, 'en')
        const bob = await f.service.trainer(f.bob, 'en')
        expect(alice.trainer.elo).toBe(scenario.alice + scenario.expected)
        expect(bob.trainer.elo).toBe(scenario.bob - scenario.expected)
        expect(alice.trainer.elo + bob.trainer.elo).toBe(scenario.alice + scenario.bob)
        expect(alice.history.at(-1)?.change).toBe(scenario.expected)
        expect(bob.history.at(-1)?.change).toBe(scenario.expected === 0 ? 0 : -scenario.expected)
      }
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest(
  'demo history is reproducible, uses real Elo transfers and preserves played duels',
  async () => {
    const f = await fixture(6)
    try {
      await f.prisma.pvpRating.createMany({
        data: f.users.map((userId, index) => ({ userId, elo: 1600 - index * 70 })),
      })
      const played = await f.service.create(f.alice, f.bob, f.team, 'en')
      await f.service.accept(f.bob, played.id, f.team, 'en')
      await f.service.leave(f.bob, played.id, 'en')
      const before = await f.prisma.pvpRating.findMany({
        where: { userId: { in: f.users } },
        orderBy: { userId: 'asc' },
      })
      expect(await seedPvpDemoHistory(f.prisma, f.users, f.team)).toBe(30)
      expect(await seedPvpDemoHistory(f.prisma, f.users, f.team)).toBe(0)
      expect(
        await f.prisma.pvpRating.findMany({
          where: { userId: { in: f.users } },
          orderBy: { userId: 'asc' },
        }),
      ).toEqual(before)
      for (const userId of f.users) {
        const history = await f.prisma.pvpResult.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        })
        expect(history.length).toBe(userId === f.alice || userId === f.bob ? 11 : 10)
        expect(new Set(history.map((row) => row.createdAt.toISOString().slice(0, 10))).size).toBe(
          history.length,
        )
        for (let index = 1; index < history.length; index++) {
          expect(history[index]!.eloBefore).toBe(history[index - 1]!.eloAfter)
        }
        expect(history.at(-1)?.eloAfter).toBe(before.find((row) => row.userId === userId)?.elo)
        expect((await f.service.trainer(userId, 'en')).history).toHaveLength(10)
      }
      const matches = await f.prisma.pvpMatch.findMany({
        where: { challengerId: { in: f.users } },
        include: { results: true },
      })
      for (const match of matches) {
        const state = readBattle(match.stateJson)
        const first = match.results.find((row) => row.userId === match.challengerId)!
        const second = match.results.find((row) => row.userId === match.opponentId)!
        const score = state.winnerId === null ? 0.5 : Number(state.winnerId === match.challengerId)
        expect(first.eloAfter - first.eloBefore).toBe(
          eloDelta(first.eloBefore, second.eloBefore, score),
        )
        expect(first.eloAfter + second.eloAfter).toBe(first.eloBefore + second.eloBefore)
      }
      expect((await f.service.get(f.alice, played.id, 'en')).winnerId).toBe(f.alice)
    } finally {
      await f.cleanup()
    }
  },
)

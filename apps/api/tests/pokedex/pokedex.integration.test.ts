import { afterAll, expect, test } from 'bun:test'
import { Elysia } from 'elysia'
import { getFinishRank, type CardFinish } from '@tcg-collection/shared'
import { AuthService } from '../../src/auth/auth-service'
import { PrismaAuthStore } from '../../src/auth/prisma-auth-store'
import { hashSessionToken } from '../../src/auth/session-token'
import { PokemonRepository } from '../../src/pokemon/pokemon-repository'
import { PokedexRepository } from '../../src/pokemon/pokedex-repository'
import { createPokedexController } from '../../src/pokemon/pokedex-controller'
import { PrismaTradeRepository } from '../../src/trade/trade-repository'
import { TradeService } from '../../src/trade/trade-service'

const databaseTest = Bun.env.RUN_DATABASE_TESTS === 'true' ? test : test.skip

async function fixture() {
  const url = new URL(Bun.env.DATABASE_URL ?? 'https://invalid')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith('_test')) {
    throw new Error('Pokédex tests require a disposable loopback _test database')
  }
  const { prisma } = await import('../../src/db/prisma')
  const suffix = crypto.randomUUID()
  const alice = { id: `alice-${suffix}`, pseudo: 'Alice' }
  const bob = { id: `bob-${suffix}`, pseudo: 'Bob' }
  const setId = `pokedex-${suffix}`
  const cards = ['10', '2', '1', 'TG2'].map((number) => ({
    id: `${setId}-${number}`,
    setId,
    name: `Card ${number}`,
    number,
  }))
  await prisma.user.createMany({
    data: [alice, bob].map((user) => ({ ...user, slackUserId: user.id })),
  })
  await prisma.pokemonSet.create({
    data: {
      id: setId,
      name: 'Test set',
      nameFr: 'Extension test',
      series: 'Tests',
      total: 3,
      releaseDate: '2026-09-19',
      rawJson: '{}',
      syncedAt: '',
      cards: {
        create: cards.map((card) => ({
          id: card.id,
          localId: card.number,
          name: card.name,
          nameFr: `Carte ${card.number}`,
          rawJson: '{}',
          syncedAt: '',
        })),
      },
    },
  })
  return {
    prisma,
    alice,
    bob,
    setId,
    cards,
    pokemon: new PokemonRepository(prisma),
    pokedex: new PokedexRepository(prisma),
    trade: new TradeService({ tradeRepository: new PrismaTradeRepository(prisma) }),
    cleanup: async () => {
      await prisma.user.deleteMany({ where: { id: { in: [alice.id, bob.id] } } })
      await prisma.pokemonSet.delete({ where: { id: setId } })
    },
  }
}

databaseTest('a gift stays discovered after inventory removal and catalog refresh', async () => {
  const f = await fixture()
  try {
    const card = f.cards[0]!
    await f.pokemon.recordCardGift(f.alice.id, card.id, 'holo', 1)
    await f.pokemon.recordCardGift(f.alice.id, card.id, 'normal', 2)
    await f.prisma.giftedUserCard.deleteMany({ where: { userId: f.alice.id } })
    await f.pokemon.replaceSetCards(f.setId, [], new Date().toISOString())
    const after = await f.pokedex.getSet(f.alice.id, f.setId, 1, 12, 'en')
    expect(after?.set).toMatchObject({ catalogCount: 1, discoveredCount: 1 })
    expect(after?.slots[0]).toMatchObject({
      discovered: true,
      card: { id: card.id, finish: 'holo' },
    })
    expect((await f.pokedex.overview(f.alice.id, 'en')).sets).toContainEqual(
      expect.objectContaining({ id: f.setId, discoveredCount: 1 }),
    )
    expect((await f.pokedex.getSet(f.bob.id, f.setId, 1, 12, 'en'))?.set.discoveredCount).toBe(0)
  } finally {
    await f.cleanup()
  }
})

databaseTest(
  'only the best acquired finish is retained across upgrades and concurrent gifts',
  async () => {
    const f = await fixture()
    try {
      const card = f.cards[0]!
      const otherPrinting = f.cards[1]!
      await f.prisma.pokemonCard.update({
        where: { id: otherPrinting.id },
        data: { name: card.name },
      })
      const finishes: CardFinish[] = ['holo', 'normal', 'reverse_holo']
      finishes.sort((first, second) => getFinishRank(first) - getFinishRank(second))
      let firstObtainedAt: string | undefined
      for (const finish of finishes) {
        await f.pokemon.recordCardGift(f.alice.id, card.id, finish, 1)
        const page = await f.pokedex.getSet(f.alice.id, f.setId, 1, 12, 'en')
        const slot = page?.slots.find((candidate) => candidate.card.id === card.id)
        firstObtainedAt ??= slot?.firstObtainedAt
        expect(slot).toMatchObject({ card: { finish }, firstObtainedAt })
        expect(page?.set.discoveredCount).toBe(1)
      }
      await Promise.all([
        f.pokemon.recordCardGift(f.alice.id, card.id, 'normal', 1),
        f.pokemon.recordCardGift(f.alice.id, card.id, 'reverse_holo', 1),
        f.pokemon.recordCardGift(f.bob.id, card.id, 'normal', 1),
        f.pokemon.recordCardGift(f.bob.id, card.id, 'holo', 1),
      ])
      for (const user of [f.alice, f.bob]) {
        const page = await f.pokedex.getSet(user.id, f.setId, 1, 12, 'en')
        expect(page?.slots.find((slot) => slot.card.id === card.id)?.card.finish).toBe('holo')
        expect(page?.slots.find((slot) => slot.card.id === otherPrinting.id)?.discovered).toBe(
          false,
        )
      }
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest('a failed pack rolls back discoveries alongside cards and cooldown', async () => {
  const f = await fixture()
  try {
    await expect(
      f.pokemon.recordPackOpening(f.alice.id, f.setId, [
        f.cards[0]!,
        { id: 'missing-card', setId: f.setId, number: '99', name: 'Missing' },
      ]),
    ).rejects.toThrow()
    expect((await f.pokedex.getSet(f.alice.id, f.setId, 1, 12, 'en'))?.set.discoveredCount).toBe(0)
    expect(await f.pokemon.listOwnedCardIds(f.alice.id)).toEqual([])
    expect(await f.pokemon.getBoosterCooldownAnchor(f.alice.id)).toBeNull()
  } finally {
    await f.cleanup()
  }
})

databaseTest('private pages enforce authentication, locale and pagination bounds', async () => {
  const f = await fixture()
  try {
    const store = new PrismaAuthStore(f.prisma)
    const authService = new AuthService({ sessionCookieName: 'pokedex_session', store })
    const app = new Elysia().use(createPokedexController(f.pokedex, authService))
    expect((await app.handle(new Request('http://localhost/pokedex'))).status).toBe(401)
    expect((await app.handle(new Request(`http://localhost/pokedex/sets/${f.setId}`))).status).toBe(
      401,
    )
    const token = crypto.randomUUID()
    await store.createSession(f.alice.id, await hashSessionToken(token))
    await f.pokemon.recordCardGift(f.alice.id, f.cards[0]!.id, 'holo', 1)
    const headers = { cookie: `pokedex_session=${token}` }
    const page = await app.handle(
      new Request(`http://localhost/pokedex/sets/${f.setId}?page=2&pageSize=2&locale=fr`, {
        headers,
      }),
    )
    expect(page.status).toBe(200)
    expect(page.headers.get('Cache-Control')).toBe('no-store')
    expect(await page.json()).toMatchObject({
      set: { name: 'Extension test', discoveredCount: 1 },
      slots: [
        { card: { number: '10', name: 'Carte 10', finish: 'holo' } },
        { card: { number: 'TG2' }, discovered: false },
      ],
      pagination: { page: 2, pageSize: 2, total: 4, pageCount: 2 },
    })
    const tooLarge = await app.handle(
      new Request(`http://localhost/pokedex/sets/${f.setId}?pageSize=1000`, { headers }),
    )
    expect(tooLarge.status).toBe(422)
    const unknown = await app.handle(
      new Request('http://localhost/pokedex/sets/missing', { headers }),
    )
    expect(unknown.status).toBe(404)
  } finally {
    await f.cleanup()
  }
})

databaseTest(
  'legacy backfill restores traded-away cards and preserves the earliest proof',
  async () => {
    const f = await fixture()
    try {
      const [auctionCard, offerCard, openedCard, pendingCard] = f.cards
      const openedAt = new Date('2026-01-01T00:00:00Z')
      const offeredAt = new Date('2026-02-01T00:00:00Z')
      const acceptedAt = new Date('2026-03-01T00:00:00Z')
      const auctionId = `legacy-auction-${f.setId}`
      await f.prisma.packOpening.create({
        data: {
          id: `legacy-pack-${f.setId}`,
          userId: f.alice.id,
          setId: f.setId,
          openedAt,
          cards: {
            create: [
              { cardId: auctionCard!.id, finish: 'normal', position: 1 },
              { cardId: openedCard!.id, finish: 'normal', position: 2 },
              { cardId: openedCard!.id, finish: 'holo', position: 3 },
            ],
          },
        },
      })
      await f.prisma.tradeAuction.create({
        data: {
          id: auctionId,
          creatorId: f.alice.id,
          offeredCardId: auctionCard!.id,
          offeredCardFinish: 'reverse_holo',
          requirements: {},
          filters: {},
          status: 'accepted',
          createdAt: offeredAt,
          updatedAt: acceptedAt,
          expiresAt: acceptedAt,
          offers: {
            create: [
              {
                id: `legacy-accepted-${f.setId}`,
                proposerId: f.bob.id,
                status: 'accepted',
                createdAt: offeredAt,
                updatedAt: acceptedAt,
                cards: { create: { cardId: offerCard!.id, finish: 'holo', quantity: 1 } },
              },
              {
                id: `legacy-pending-${f.setId}`,
                proposerId: f.bob.id,
                status: 'pending',
                cards: { create: { cardId: pendingCard!.id, finish: 'holo', quantity: 1 } },
              },
            ],
          },
        },
      })
      const migration = await Bun.file(
        new URL(
          '../../prisma/migrations/20260920000000_pokedex_discoveries/migration.sql',
          import.meta.url,
        ),
      ).text()
      const backfill = migration.slice(migration.indexOf('WITH historical_possession'))
      const finishMigration = await Bun.file(
        new URL(
          '../../prisma/migrations/20260920010000_pokedex_best_finish/migration.sql',
          import.meta.url,
        ),
      ).text()
      const finishBackfill = finishMigration.slice(
        finishMigration.indexOf('WITH historical_finishes'),
      )
      const rollback = new Error('rollback test-only backfill')
      await expect(
        f.prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(backfill)
          await tx.$executeRawUnsafe(backfill)
          await tx.$executeRawUnsafe(finishBackfill)
          await tx.$executeRawUnsafe(finishBackfill)
          const pokedex = new PokedexRepository(tx)
          const alice = await pokedex.getSet(f.alice.id, f.setId, 1, 12, 'en')
          const bob = await pokedex.getSet(f.bob.id, f.setId, 1, 12, 'en')
          expect(alice?.set.discoveredCount).toBe(3)
          expect(bob?.set.discoveredCount).toBe(2)
          for (const page of [alice, bob]) {
            expect(page?.slots.find((slot) => slot.card.id === auctionCard!.id)?.card.finish).toBe(
              'reverse_holo',
            )
            expect(page?.slots.find((slot) => slot.card.id === offerCard!.id)?.card.finish).toBe(
              'holo',
            )
          }
          expect(alice?.slots.find((slot) => slot.card.id === openedCard!.id)?.card.finish).toBe(
            'holo',
          )
          expect(
            alice?.slots.find((slot) => slot.card.id === auctionCard!.id)?.firstObtainedAt,
          ).toBe(openedAt.toISOString())
          expect(alice?.slots.find((slot) => slot.card.id === offerCard!.id)?.firstObtainedAt).toBe(
            acceptedAt.toISOString(),
          )
          expect(bob?.slots.find((slot) => slot.card.id === offerCard!.id)?.firstObtainedAt).toBe(
            offeredAt.toISOString(),
          )
          expect(alice?.slots.find((slot) => slot.card.id === pendingCard!.id)?.discovered).toBe(
            false,
          )
          throw rollback
        }),
      ).rejects.toBe(rollback)
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest(
  'discoveries survive trading away the last copy and count card identities once',
  async () => {
    const f = await fixture()
    try {
      const aliceCard = f.cards[0]!
      const bobCard = f.cards[1]!
      await f.pokemon.recordPackOpening(f.alice.id, f.setId, [{ ...aliceCard, finish: 'holo' }])
      await f.pokemon.recordPackOpening(f.bob.id, f.setId, [
        bobCard,
        { ...bobCard, finish: 'holo' },
      ])
      const before = await f.pokedex.getSet(f.alice.id, f.setId, 1, 12, 'fr')
      expect(before?.set.discoveredCount).toBe(1)
      const firstObtainedAt = before?.slots.find(
        (slot) => slot.card.id === aliceCard.id,
      )?.firstObtainedAt
      const auction = await f.trade.createAuction(f.alice, {
        offeredCardId: aliceCard.id,
        offeredCardFinish: 'holo',
      })
      if ('error' in auction) throw new Error(auction.error)
      const offer = await f.trade.createOffer(f.bob, auction.id, {
        cards: [{ cardId: bobCard.id, finish: 'holo', quantity: 1 }],
      })
      if ('error' in offer) throw new Error(offer.error)
      const accepted = await f.trade.acceptOffer(f.alice, auction.id, offer.id)
      expect(accepted).not.toHaveProperty('error')
      expect(await f.pokemon.listOwnedCardIds(f.alice.id)).not.toContain(aliceCard.id)
      const after = await f.pokedex.getSet(f.alice.id, f.setId, 1, 12, 'fr')
      expect(after?.set).toMatchObject({
        name: 'Extension test',
        catalogCount: 4,
        discoveredCount: 2,
      })
      expect(after?.slots.map((slot) => slot.card.number)).toEqual(['1', '2', '10', 'TG2'])
      expect(after?.slots.find((slot) => slot.card.id === aliceCard.id)).toMatchObject({
        discovered: true,
        firstObtainedAt,
        card: { finish: 'holo' },
      })
      const bobPokedex = await f.pokedex.getSet(f.bob.id, f.setId, 1, 12, 'en')
      expect(bobPokedex?.set.discoveredCount).toBe(2)
      expect(
        bobPokedex?.slots.filter((slot) => slot.discovered).map((slot) => slot.card.finish),
      ).toEqual(['holo', 'holo'])
    } finally {
      await f.cleanup()
    }
  },
)

databaseTest(
  'finish backfill uses inventory evidence and never infers catalog variants',
  async () => {
    const f = await fixture()
    try {
      const [ownedCard, giftedCard, unknownFinishCard, catalogOnlyCard] = f.cards
      const firstCollectedAt = new Date('2026-01-01T00:00:00Z')
      await f.prisma.userCard.createMany({
        data: ['normal', 'holo'].map((finish) => ({
          userId: f.alice.id,
          cardId: ownedCard!.id,
          finish,
          quantity: 1,
          firstCollectedAt,
          updatedAt: firstCollectedAt,
        })),
      })
      await f.prisma.giftedUserCard.createMany({
        data: [
          { cardId: giftedCard!.id, finish: ' Reverse-Holofoil ' },
          { cardId: unknownFinishCard!.id, finish: 'unknown' },
        ].map((card) => ({
          ...card,
          userId: f.alice.id,
          quantity: 1,
          firstCollectedAt,
          updatedAt: firstCollectedAt,
        })),
      })
      await f.prisma.pokemonCard.update({
        where: { id: catalogOnlyCard!.id },
        data: { rawJson: JSON.stringify({ variants: { normal: true, holo: true } }) },
      })
      const migration = await Bun.file(
        new URL(
          '../../prisma/migrations/20260920000000_pokedex_discoveries/migration.sql',
          import.meta.url,
        ),
      ).text()
      const finishMigration = await Bun.file(
        new URL(
          '../../prisma/migrations/20260920010000_pokedex_best_finish/migration.sql',
          import.meta.url,
        ),
      ).text()
      const rollback = new Error('rollback inventory backfill test')
      await expect(
        f.prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            migration.slice(migration.indexOf('WITH historical_possession')),
          )
          const finishBackfill = finishMigration.slice(
            finishMigration.indexOf('WITH historical_finishes'),
          )
          await tx.$executeRawUnsafe(finishBackfill)
          await tx.userCard.deleteMany({ where: { userId: f.alice.id, finish: 'holo' } })
          await tx.$executeRawUnsafe(finishBackfill)
          const page = await new PokedexRepository(tx).getSet(f.alice.id, f.setId, 1, 12, 'en')
          expect(page?.set.discoveredCount).toBe(3)
          expect(page?.slots.find((slot) => slot.card.id === ownedCard!.id)?.card.finish).toBe(
            'holo',
          )
          expect(page?.slots.find((slot) => slot.card.id === giftedCard!.id)?.card.finish).toBe(
            'reverse_holo',
          )
          expect(
            page?.slots.find((slot) => slot.card.id === unknownFinishCard!.id)?.card.finish,
          ).toBe('normal')
          expect(page?.slots.find((slot) => slot.card.id === catalogOnlyCard!.id)?.discovered).toBe(
            false,
          )
          throw rollback
        }),
      ).rejects.toBe(rollback)
    } finally {
      await f.cleanup()
    }
  },
)

afterAll(async () => {
  if (Bun.env.RUN_DATABASE_TESTS === 'true') {
    const { prisma } = await import('../../src/db/prisma')
    await prisma.$disconnect()
  }
})

import { afterAll, expect, setSystemTime, test } from 'bun:test'
import { BOOSTER_TEASE_MS, SCHEDULED_BOOSTER_RELEASES } from '../../src/pokemon/pokemon-config'
import { PokemonRepository } from '../../src/pokemon/pokemon-repository'

const databaseTest = Bun.env.RUN_DATABASE_TESTS === 'true' ? test : test.skip

const [scheduledSetId, releasesAt] = Object.entries(SCHEDULED_BOOSTER_RELEASES)[0] ?? []
const releaseAt = Date.parse(releasesAt ?? '')
const FIXTURE_NAME = 'Scheduled set'

async function fixture() {
  const url = new URL(Bun.env.DATABASE_URL ?? 'https://invalid')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith('_test')) {
    throw new Error('Pokémon repository tests require a disposable loopback _test database')
  }
  const { prisma } = await import('../../src/db/prisma')
  await prisma.pokemonSet.create({
    data: {
      id: scheduledSetId!,
      name: FIXTURE_NAME,
      nameFr: 'Extension programmée',
      series: 'Tests',
      total: 1,
      releaseDate: '2026-09-19',
      boosterImageUrl: 'https://example.test/booster.png',
      rawJson: '{}',
      syncedAt: '',
      cards: {
        create: [
          {
            id: `${scheduledSetId}-1`,
            localId: '1',
            name: 'Card 1',
            nameFr: 'Carte 1',
            rawJson: '{}',
            syncedAt: '',
          },
        ],
      },
    },
  })
  return {
    pokemon: new PokemonRepository(prisma),
    // Name-scoped so a real synced set sharing the id is never deleted.
    cleanup: async () => {
      setSystemTime()
      await prisma.pokemonSet.deleteMany({ where: { id: scheduledSetId, name: FIXTURE_NAME } })
    },
  }
}

databaseTest('a scheduled booster is not listed until it is released', async () => {
  const f = await fixture()
  try {
    setSystemTime(new Date(releaseAt - 1))
    expect((await f.pokemon.listSets('en')).map((set) => set.id)).not.toContain(scheduledSetId)
    expect(await f.pokemon.getSet(scheduledSetId!, 'en')).toBeUndefined()

    setSystemTime(new Date(releaseAt))
    expect((await f.pokemon.listSets('en')).map((set) => set.id)).toContain(scheduledSetId)
    expect(await f.pokemon.getSet(scheduledSetId!, 'en')).toMatchObject({ id: scheduledSetId })
  } finally {
    await f.cleanup()
  }
})

databaseTest('the cards of a scheduled booster stay unreadable until it is released', async () => {
  const f = await fixture()
  try {
    setSystemTime(new Date(releaseAt - 1))
    expect(await f.pokemon.listCards(scheduledSetId, 'en')).toEqual([])
    expect((await f.pokemon.listCards(undefined, 'en')).map((card) => card.id)).not.toContain(
      `${scheduledSetId}-1`,
    )

    setSystemTime(new Date(releaseAt))
    expect((await f.pokemon.listCards(scheduledSetId, 'en')).map((card) => card.id)).toEqual([
      `${scheduledSetId}-1`,
    ])
  } finally {
    await f.cleanup()
  }
})

databaseTest('a scheduled booster is teased only inside its window', async () => {
  const f = await fixture()
  try {
    setSystemTime(new Date(releaseAt - BOOSTER_TEASE_MS - 1))
    expect(await f.pokemon.listUpcomingSets('en')).toEqual([])

    setSystemTime(new Date(releaseAt - BOOSTER_TEASE_MS))
    expect(await f.pokemon.listUpcomingSets('en')).toMatchObject([
      { id: scheduledSetId, releasesAt },
    ])

    setSystemTime(new Date(releaseAt))
    expect(await f.pokemon.listUpcomingSets('en')).toEqual([])
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

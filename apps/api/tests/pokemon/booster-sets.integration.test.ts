import { afterAll, expect, test } from 'bun:test'
import { PokemonRepository } from '../../src/pokemon/pokemon-repository'
import { PokedexRepository } from '../../src/pokemon/pokedex-repository'

const databaseTest = Bun.env.RUN_DATABASE_TESTS === 'true' ? test : test.skip

async function fixture() {
  const url = new URL(Bun.env.DATABASE_URL ?? 'https://invalid')
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith('_test')) {
    throw new Error('Booster set tests require a disposable loopback _test database')
  }
  const { prisma } = await import('../../src/db/prisma')
  const suffix = crypto.randomUUID()
  const boosterSetId = `booster-${suffix}`
  const blankArtworkSetId = `blank-${suffix}`
  const giftSetId = `gift-${suffix}`
  const setIds = [boosterSetId, blankArtworkSetId, giftSetId]
  const userId = `probe-${suffix}`
  const base = { series: 'Tests', total: 1, rawJson: '{}', syncedAt: '' }

  await prisma.user.create({ data: { id: userId, slackUserId: userId, pseudo: 'Probe' } })
  await prisma.pokemonSet.createMany({
    data: [
      {
        ...base,
        id: boosterSetId,
        name: 'Booster set',
        releaseDate: '2099-01-03',
        boosterImageUrl: 'https://example.com/booster.png',
      },
      { ...base, id: blankArtworkSetId, name: 'Custom', releaseDate: '2099-01-02' },
      { ...base, id: giftSetId, name: 'Custom', releaseDate: '2099-01-01', boosterImageUrl: '' },
    ],
  })
  await prisma.pokemonCard.createMany({
    data: setIds.map((setId) => ({
      id: `${setId}-001`,
      setId,
      localId: '001',
      name: 'Probe ex',
      rawJson: '{}',
      syncedAt: '',
    })),
  })

  return {
    prisma,
    repository: new PokemonRepository(prisma),
    pokedex: new PokedexRepository(prisma),
    boosterSetId,
    blankArtworkSetId,
    giftSetId,
    userId,
    cleanup: async () => {
      await prisma.pokemonSet.deleteMany({ where: { id: { in: setIds } } })
      await prisma.user.delete({ where: { id: userId } })
    },
  }
}

databaseTest('a set without booster artwork is neither listed nor openable', async () => {
  const f = await fixture()
  const listedIds = (await f.repository.listSets('en')).map((set) => set.id)

  expect(listedIds).toContain(f.boosterSetId)
  expect(listedIds).not.toContain(f.blankArtworkSetId)
  expect(listedIds).not.toContain(f.giftSetId)
  expect(await f.repository.getSet(f.boosterSetId, 'en')).toBeDefined()
  expect(await f.repository.getSet(f.blankArtworkSetId, 'en')).toBeUndefined()
  expect(await f.repository.getSet(f.giftSetId, 'en')).toBeUndefined()

  await f.cleanup()
})

databaseTest('a set without booster artwork stays out of the Pokédex', async () => {
  const f = await fixture()
  const binderIds = (await f.pokedex.overview(f.userId, 'en')).sets.map((set) => set.id)

  expect(binderIds).toContain(f.boosterSetId)
  expect(binderIds).not.toContain(f.blankArtworkSetId)
  expect(binderIds).not.toContain(f.giftSetId)
  expect(await f.pokedex.getSet(f.userId, f.boosterSetId, 1, 12, 'en')).toBeDefined()
  expect(await f.pokedex.getSet(f.userId, f.blankArtworkSetId, 1, 12, 'en')).toBeUndefined()
  expect(await f.pokedex.getSet(f.userId, f.giftSetId, 1, 12, 'en')).toBeUndefined()

  await f.cleanup()
})

afterAll(async () => {
  if (Bun.env.RUN_DATABASE_TESTS !== 'true') return
  const { prisma } = await import('../../src/db/prisma')
  await prisma.$disconnect()
})

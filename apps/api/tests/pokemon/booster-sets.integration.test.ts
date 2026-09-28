import { afterAll, expect, test } from 'bun:test'
import { PackCooldownError } from '../../src/pokemon/pack-cooldown'
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
      await prisma.user.delete({ where: { id: userId } })
      await prisma.pokemonSet.deleteMany({ where: { id: { in: setIds } } })
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

databaseTest('the first opening of a released booster is free exactly once', async () => {
  const f = await fixture()
  const anchor = new Date()
  await f.prisma.user.update({ where: { id: f.userId }, data: { boosterCooldownAnchor: anchor } })
  const cards = [
    { id: `${f.boosterSetId}-001`, setId: f.boosterSetId, name: 'Probe ex', number: '001' },
  ]
  const open = () =>
    f.repository.recordPackOpening(f.userId, f.boosterSetId, cards, { firstOpeningIsFree: true })

  const results = await Promise.allSettled([open(), open()])

  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.find((result) => result.status === 'rejected')?.reason).toBeInstanceOf(
    PackCooldownError,
  )
  expect(await f.repository.getBoosterCooldownAnchor(f.userId)).toEqual(anchor)
  expect(await f.repository.listOpenedSetIds(f.userId, [f.boosterSetId])).toEqual([f.boosterSetId])

  await f.cleanup()
})

databaseTest('a gifted booster is spent only once the regular charges are gone', async () => {
  const f = await fixture()
  const fullChargesAnchor = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
  await f.prisma.user.update({
    where: { id: f.userId },
    data: { boosterCooldownAnchor: fullChargesAnchor, bonusBoosters: 1 },
  })
  const cards = [
    { id: `${f.boosterSetId}-001`, setId: f.boosterSetId, name: 'Probe ex', number: '001' },
  ]
  const open = () => f.repository.recordPackOpening(f.userId, f.boosterSetId, cards)
  const bonusBoosters = () => f.repository.getBonusBoosters(f.userId)

  await open()
  await open()
  expect(await bonusBoosters()).toBe(1)

  const results = await Promise.allSettled([open(), open()])

  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  expect(results.find((result) => result.status === 'rejected')?.reason).toBeInstanceOf(
    PackCooldownError,
  )
  expect(await bonusBoosters()).toBe(0)

  await f.cleanup()
})

afterAll(async () => {
  if (Bun.env.RUN_DATABASE_TESTS !== 'true') return
  const { prisma } = await import('../../src/db/prisma')
  await prisma.$disconnect()
})

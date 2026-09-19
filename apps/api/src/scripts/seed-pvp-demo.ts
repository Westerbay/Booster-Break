import { PrismaAuthStore } from '../auth/prisma-auth-store'
import { parseArgs } from './script-utils'
import { TcgDexClient } from '../pokemon/tcgdex-client'
import { toCardWrite } from '../pokemon/pokemon-mappers'
import { cleanupPvpDemoHistory, seedPvpDemoHistory } from './pvp-demo-history'

// This scenario is deliberately restricted to a disposable, loopback test database.
const target = new URL(Bun.env.DATABASE_URL ?? 'https://invalid')
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || !target.pathname.endsWith('_test')) {
  throw new Error('PvP demo requires a disposable loopback database whose name ends in _test')
}
const { prisma } = await import('../db/prisma')
const setId = 'pvp-demo'
const pseudos = [
  'pvp-demo-alex',
  'pvp-demo-lea',
  'pvp-demo-mathis',
  'pvp-demo-sam',
  'pvp-demo-camille',
  'pvp-demo-noah',
]
const cardIds = ['swsh12-036', 'swsh12-002', 'sv03.5-025', 'sv03.5-001', 'sv03.5-006', 'sv03.5-009']
const args = parseArgs()
try {
  if (args['cleanup-history'] === 'true') {
    const result = await cleanupPvpDemoHistory(prisma)
    console.log(
      `Removed ${result.count} seeded history matches; users and played duels were preserved.`,
    )
  } else if (args.cleanup === 'true') {
    await prisma.user.deleteMany({
      where: { slackUserId: { in: pseudos.map((pseudo) => `custom:${pseudo}`) } },
    })
    await prisma.pokemonSet.deleteMany({ where: { id: setId } })
    console.log('Removed only the pvp-demo scenario.')
  } else {
    const now = new Date()
    await prisma.pokemonSet.upsert({
      where: { id: setId },
      update: {},
      create: {
        id: setId,
        name: 'PvP · local demo',
        series: 'Local demo',
        total: cardIds.length,
        releaseDate: '2026-09-19',
        rawJson: '{}',
        syncedAt: now.toISOString(),
      },
    })
    const present = await prisma.pokemonCard.count({
      where: { id: { in: cardIds.map((id) => `pvp-demo-${id}`) } },
    })
    if (present !== cardIds.length) {
      const [cards, frenchCards] = await Promise.all([
        new TcgDexClient('en').getCardsByIds(cardIds),
        new TcgDexClient('fr').getCardsByIds(cardIds),
      ])
      if (cards.length !== cardIds.length) throw new Error('TCGdex did not return all demo cards')
      const names = new Map(frenchCards.map((card) => [card.id, { fr: card.name }]))
      for (const card of cards) {
        const data = {
          ...toCardWrite(card, now.toISOString(), names),
          id: `pvp-demo-${card.id}`,
          setId,
        }
        await prisma.pokemonCard.upsert({ where: { id: data.id }, create: data, update: data })
      }
    }
    const auth = new PrismaAuthStore(prisma)
    const demoUserIds: string[] = []
    for (const [index, pseudo] of pseudos.entries()) {
      const user = await auth.upsertCustomUser({
        pseudo,
        displayName: ['Alex', 'Léa', 'Mathis', 'Sam', 'Camille', 'Noah'][index],
      })
      demoUserIds.push(user.id)
      for (const id of cardIds) {
        const cardId = `pvp-demo-${id}`
        await prisma.userCard.upsert({
          where: { userId_cardId_finish: { userId: user.id, cardId, finish: 'normal' } },
          create: {
            userId: user.id,
            cardId,
            finish: 'normal',
            quantity: 1,
            firstCollectedAt: now,
            updatedAt: now,
          },
          update: {},
        })
      }
      // Synthetic records are scoped to this demo; never loaded by the production app.
      await prisma.pvpRating.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          elo: [1608, 1536, 1420, 1368, 1284, 1216][index],
          wins: 72 - index * 10,
          losses: 26 + index,
          draws: 4,
        },
        update: {},
      })
      for (let position = 0; position < 3; position++) {
        const cardId = `pvp-demo-${cardIds[(index + position) % cardIds.length]}`
        await prisma.pvpCardStat.upsert({
          where: { userId_cardId: { userId: user.id, cardId } },
          create: {
            userId: user.id,
            cardId,
            wins: 38 - position * 8 - index,
            losses: 12 + position,
            draws: 2,
          },
          update: {},
        })
      }
    }
    const added = await seedPvpDemoHistory(
      prisma,
      demoUserIds,
      cardIds.slice(0, 3).map((id) => ({ cardId: `pvp-demo-${id}`, finish: 'normal' })),
    )
    console.log(
      `Added ${added} history matches across ten days; current ratings and existing duels were preserved.`,
    )
    console.log(
      'Local PvP demo ready. Sign in with pseudo pvp-demo-mathis; challenge pvp-demo-alex. Records are synthetic.',
    )
  }
} finally {
  await prisma.$disconnect()
}

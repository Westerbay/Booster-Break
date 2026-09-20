import { prisma } from '../db/prisma'
import { PokemonRepository } from '../pokemon/pokemon-repository'
import { parseArgs, toPositiveInt } from './script-utils'

type GiftFinish = 'normal' | 'holo' | 'reverse_holo'

const CUSTOM_SET_ID = 'custom'
const FINISH_VARIANTS: Record<GiftFinish, 'normal' | 'holo' | 'reverse'> = {
  normal: 'normal',
  holo: 'holo',
  reverse_holo: 'reverse',
}

const args = parseArgs()
const userId = args.userId
const name = args.name
const imageUrl = args.imageUrl
const rarity = args.rarity ?? 'Rare'
const category = args.category ?? 'Pokemon'
const finish = (args.finish as GiftFinish | undefined) ?? 'normal'
const quantity = args.quantity ? toPositiveInt(args.quantity, '--quantity') : 1

if (!userId) {
  console.error('Missing required --userId')
  process.exit(1)
}

if (!name) {
  console.error('Missing required --name')
  process.exit(1)
}

if (!imageUrl || !isHttpUrl(imageUrl)) {
  console.error('Missing or invalid --imageUrl (expected an http(s) URL)')
  process.exit(1)
}

if (!isValidGiftFinish(finish)) {
  console.error(`Invalid finish: ${finish}. Allowed: normal, holo, reverse_holo`)
  process.exit(1)
}

const cardId = args.cardId ?? `${CUSTOM_SET_ID}-${toCardSlug(name)}`

if (!/^[a-z0-9][a-z0-9-]*$/.test(cardId)) {
  console.error(`Invalid card id: ${cardId}. Pass an explicit --cardId.`)
  process.exit(1)
}

const user = await prisma.user.findUnique({ where: { id: userId } })

if (!user) {
  console.error(`User not found: ${userId}`)
  process.exit(1)
}

const existingCard = await prisma.pokemonCard.findUnique({ where: { id: cardId } })

if (existingCard && existingCard.setId !== CUSTOM_SET_ID) {
  console.error(`Card ${cardId} already belongs to set ${existingCard.setId}`)
  process.exit(1)
}

const syncedAt = new Date().toISOString()
const cardWrite = {
  name,
  nameEn: name,
  nameFr: name,
  rarity,
  category,
  imageSmall: imageUrl,
  imageLarge: imageUrl,
  rawJson: JSON.stringify({
    variants: { ...parseVariants(existingCard?.rawJson), [FINISH_VARIANTS[finish]]: true },
  }),
  syncedAt,
}

// Artwork-less on purpose: that is what keeps this set unlisted and unopenable.
await prisma.pokemonSet.upsert({
  where: { id: CUSTOM_SET_ID },
  create: {
    id: CUSTOM_SET_ID,
    name: 'Custom',
    series: 'Custom',
    total: 0,
    releaseDate: '1800-01-01',
    rawJson: '{}',
    syncedAt,
  },
  update: { boosterImageUrl: null, syncedAt },
})

const localId =
  existingCard?.localId ??
  String((await prisma.pokemonCard.count({ where: { setId: CUSTOM_SET_ID } })) + 1).padStart(3, '0')

await prisma.pokemonCard.upsert({
  where: { id: cardId },
  create: { id: cardId, setId: CUSTOM_SET_ID, localId, ...cardWrite },
  update: cardWrite,
})

await prisma.pokemonSet.update({
  where: { id: CUSTOM_SET_ID },
  data: { total: await prisma.pokemonCard.count({ where: { setId: CUSTOM_SET_ID } }) },
})

await new PokemonRepository(prisma).recordCardGift(userId, cardId, finish, quantity)

console.log(
  JSON.stringify(
    {
      userId,
      user: user.pseudo,
      setId: CUSTOM_SET_ID,
      cardId,
      number: localId,
      name,
      finish,
      quantity,
    },
    null,
    2,
  ),
)

await prisma.$disconnect()

function isValidGiftFinish(value: string): value is GiftFinish {
  return value === 'normal' || value === 'holo' || value === 'reverse_holo'
}

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

function toCardSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function parseVariants(rawJson?: string): Record<string, boolean> {
  try {
    return (JSON.parse(rawJson ?? '{}') as { variants?: Record<string, boolean> }).variants ?? {}
  } catch {
    return {}
  }
}

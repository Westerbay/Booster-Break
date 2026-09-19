import { prisma } from '../db/prisma'
import { PokemonRepository } from '../pokemon/pokemon-repository'
import { parseArgs, toPositiveInt } from './script-utils'

type GiftFinish = 'normal' | 'holo' | 'reverse_holo'

const args = parseArgs()
const userId = args.userId
const cardId = args.cardId
const finish = (args.finish as GiftFinish | undefined) ?? 'normal'
const quantity = args.quantity ? toPositiveInt(args.quantity, '--quantity') : 1

if (!userId) {
  console.error('Missing required --userId')
  process.exit(1)
}

if (!cardId) {
  console.error('Missing required --cardId')
  process.exit(1)
}

if (!isValidGiftFinish(finish)) {
  console.error(`Invalid finish: ${finish}. Allowed: normal, holo, reverse_holo`)
  process.exit(1)
}

const user = await prisma.user.findUnique({ where: { id: userId } })

if (!user) {
  console.error(`User not found: ${userId}`)
  process.exit(1)
}

const card = await prisma.pokemonCard.findUnique({ where: { id: cardId } })

if (!card) {
  console.error(`Card not found: ${cardId}`)
  process.exit(1)
}

await new PokemonRepository(prisma).recordCardGift(userId, cardId, finish, quantity)

console.log(
  JSON.stringify(
    {
      userId,
      cardId,
      finish,
      quantity,
      added: quantity,
      user: user.pseudo,
    },
    null,
    2,
  ),
)

await prisma.$disconnect()

function isValidGiftFinish(value: string): value is GiftFinish {
  return value === 'normal' || value === 'holo' || value === 'reverse_holo'
}

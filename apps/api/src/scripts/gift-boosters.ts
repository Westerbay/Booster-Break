import { prisma } from '../db/prisma'
import { parseArgs, toPositiveInt } from './script-utils'

const args = parseArgs()
const count = args.count ? toPositiveInt(args.count, '--count') : 1

const { count: users } = await prisma.user.updateMany({
  data: { bonusBoosters: { increment: count } },
})

console.log(JSON.stringify({ boostersPerUser: count, users }, null, 2))

await prisma.$disconnect()

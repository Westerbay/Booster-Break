import type { Prisma } from '@prisma/client'
import type { CardFinish } from '@tcg-collection/shared'

// Called inside the acquisition transaction. PostgreSQL's ordered CardFinish enum
// makes concurrent acquisitions promote the finish without ever downgrading it.
export async function recordCardDiscovery(
  tx: Prisma.TransactionClient,
  userId: string,
  cardId: string,
  finish: CardFinish,
  firstObtainedAt: Date,
): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO "user_card_discoveries" ("user_id", "card_id", "first_obtained_at", "best_finish")
    VALUES (${userId}, ${cardId}, ${firstObtainedAt}, ${finish}::"CardFinish")
    ON CONFLICT ("user_id", "card_id") DO UPDATE
    SET "first_obtained_at" = LEAST(
      "user_card_discoveries"."first_obtained_at", EXCLUDED."first_obtained_at"
    ),
    "best_finish" = GREATEST("user_card_discoveries"."best_finish", EXCLUDED."best_finish")
  `
}

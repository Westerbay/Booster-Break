-- CreateEnum
CREATE TYPE "CardFinish" AS ENUM ('normal', 'reverse_holo', 'holo');

-- AlterTable
ALTER TABLE "user_card_discoveries" ADD COLUMN     "best_finish" "CardFinish" NOT NULL DEFAULT 'normal';

-- Replay retained acquisition evidence, never the catalogue's available finishes.
-- Enum order matches getFinishRank: normal < reverse_holo < holo.
WITH historical_finishes AS (
    SELECT "user_id", "card_id", "finish" FROM "user_cards" WHERE "quantity" > 0
    UNION ALL
    SELECT "user_id", "card_id", "finish" FROM "gifted_user_cards" WHERE "quantity" > 0
    UNION ALL
    SELECT p."user_id", c."card_id", c."finish"
    FROM "pack_openings" p
    JOIN "pack_opening_cards" c ON c."pack_opening_id" = p."id"
    UNION ALL
    SELECT a."creator_id", a."offered_card_id", a."offered_card_finish"
    FROM "trade_auctions" a
    JOIN "trade_offers" o ON o."auction_id" = a."id"
    WHERE a."status" = 'accepted' AND o."status" = 'accepted'
    UNION ALL
    SELECT o."proposer_id", a."offered_card_id", a."offered_card_finish"
    FROM "trade_offers" o
    JOIN "trade_auctions" a ON a."id" = o."auction_id"
    WHERE a."status" = 'accepted' AND o."status" = 'accepted'
    UNION ALL
    SELECT o."proposer_id", c."card_id", c."finish"
    FROM "trade_offers" o
    JOIN "trade_auctions" a ON a."id" = o."auction_id"
    JOIN "trade_offer_cards" c ON c."offer_id" = o."id"
    WHERE a."status" = 'accepted' AND o."status" = 'accepted'
    UNION ALL
    SELECT a."creator_id", c."card_id", c."finish"
    FROM "trade_auctions" a
    JOIN "trade_offers" o ON o."auction_id" = a."id"
    JOIN "trade_offer_cards" c ON c."offer_id" = o."id"
    WHERE a."status" = 'accepted' AND o."status" = 'accepted'
), normalized_finishes AS (
    SELECT "user_id", "card_id",
      regexp_replace(lower(trim("finish")), '[-[:space:]]+', '_', 'g') AS "finish"
    FROM historical_finishes
), best_finishes AS (
    SELECT "user_id", "card_id", MAX(
      CASE
        WHEN "finish" IN ('holo', 'holofoil', 'holo_foil') THEN 'holo'::"CardFinish"
        WHEN "finish" IN ('reverse_holo', 'reverseholo', 'reverse_holofoil', 'reverse_holo_foil')
          THEN 'reverse_holo'::"CardFinish"
        ELSE 'normal'::"CardFinish"
      END
    ) AS "best_finish"
    FROM normalized_finishes
    GROUP BY "user_id", "card_id"
)
UPDATE "user_card_discoveries" d
SET "best_finish" = GREATEST(d."best_finish", f."best_finish")
FROM best_finishes f
WHERE d."user_id" = f."user_id" AND d."card_id" = f."card_id";

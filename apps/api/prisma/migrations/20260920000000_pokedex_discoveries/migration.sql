-- CreateTable
CREATE TABLE "user_card_discoveries" (
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "first_obtained_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_card_discoveries_pkey" PRIMARY KEY ("user_id","card_id")
);

-- CreateIndex
CREATE INDEX "user_card_discoveries_card_id_idx" ON "user_card_discoveries"("card_id");

-- AddForeignKey
ALTER TABLE "user_card_discoveries" ADD CONSTRAINT "user_card_discoveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_card_discoveries" ADD CONSTRAINT "user_card_discoveries_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "pokemon_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill durable discoveries from all retained evidence of possession.
-- Sending a card proves prior ownership; only accepted trades prove receipt.
-- Keep the earliest recorded date when a card has multiple sources or finishes.
WITH historical_possession AS (
    SELECT "user_id", "card_id", "first_collected_at" AS obtained_at
    FROM "user_cards" WHERE "quantity" > 0
    UNION ALL
    SELECT "user_id", "card_id", "first_collected_at"
    FROM "gifted_user_cards" WHERE "quantity" > 0
    UNION ALL
    SELECT p."user_id", c."card_id", p."opened_at"
    FROM "pack_openings" p
    JOIN "pack_opening_cards" c ON c."pack_opening_id" = p."id"
    UNION ALL
    SELECT a."creator_id", a."offered_card_id", a."created_at"
    FROM "trade_auctions" a
    JOIN "trade_offers" o ON o."auction_id" = a."id"
    WHERE a."status" = 'accepted' AND o."status" = 'accepted'
    UNION ALL
    SELECT o."proposer_id", a."offered_card_id", o."updated_at"
    FROM "trade_offers" o
    JOIN "trade_auctions" a ON a."id" = o."auction_id"
    WHERE a."status" = 'accepted' AND o."status" = 'accepted'
    UNION ALL
    SELECT o."proposer_id", c."card_id", o."created_at"
    FROM "trade_offers" o
    JOIN "trade_auctions" a ON a."id" = o."auction_id"
    JOIN "trade_offer_cards" c ON c."offer_id" = o."id"
    WHERE a."status" = 'accepted' AND o."status" = 'accepted'
    UNION ALL
    SELECT a."creator_id", c."card_id", o."updated_at"
    FROM "trade_auctions" a
    JOIN "trade_offers" o ON o."auction_id" = a."id"
    JOIN "trade_offer_cards" c ON c."offer_id" = o."id"
    WHERE a."status" = 'accepted' AND o."status" = 'accepted'
)
INSERT INTO "user_card_discoveries" ("user_id", "card_id", "first_obtained_at")
SELECT "user_id", "card_id", MIN(obtained_at)
FROM historical_possession
GROUP BY "user_id", "card_id"
ON CONFLICT ("user_id", "card_id") DO UPDATE
SET "first_obtained_at" = LEAST(
    "user_card_discoveries"."first_obtained_at", EXCLUDED."first_obtained_at"
);

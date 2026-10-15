CREATE TYPE "TradeAuctionKind" AS ENUM ('offer', 'request');

ALTER TABLE "trade_auctions" ADD COLUMN "kind" "TradeAuctionKind" NOT NULL DEFAULT 'offer';

DROP INDEX IF EXISTS "trade_auctions_creator_active_card_unique_idx";

CREATE UNIQUE INDEX IF NOT EXISTS "trade_auctions_creator_active_card_unique_idx"
ON "trade_auctions"("creator_id", "kind", "offered_card_id", "offered_card_finish")
WHERE "status" = 'active';

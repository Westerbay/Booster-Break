BEGIN;

-- Keep settlement writes out while ratings and their history change scale together.
LOCK TABLE "pvp_ratings", "pvp_results" IN ACCESS EXCLUSIVE MODE;

-- Generated default change; existing migrations remain unchanged.
ALTER TABLE "pvp_ratings" ALTER COLUMN "elo" SET DEFAULT 100;

-- Intentional data backfill: preserve progress relative to the old 1200 baseline.
UPDATE "pvp_ratings" SET "elo" = GREATEST(0, "elo" - 1100);
UPDATE "pvp_results"
SET "elo_before" = GREATEST(0, "elo_before" - 1100),
    "elo_after" = GREATEST(0, "elo_after" - 1100);

COMMIT;

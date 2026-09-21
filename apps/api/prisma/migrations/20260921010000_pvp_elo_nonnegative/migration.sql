-- Prisma cannot express CHECK constraints; keep these guards in migration SQL.
-- The preceding rebase migration already clamps existing scores to zero.
BEGIN;

ALTER TABLE "pvp_ratings"
  ADD CONSTRAINT "pvp_ratings_elo_nonnegative" CHECK ("elo" >= 0);

ALTER TABLE "pvp_results"
  ADD CONSTRAINT "pvp_results_elo_before_nonnegative" CHECK ("elo_before" >= 0),
  ADD CONSTRAINT "pvp_results_elo_after_nonnegative" CHECK ("elo_after" >= 0);

COMMIT;

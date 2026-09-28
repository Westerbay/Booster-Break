-- Prisma cannot express CHECK constraints; keep this guard in migration SQL.
ALTER TABLE "users"
  ADD COLUMN "bonus_boosters" INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT "users_bonus_boosters_nonnegative" CHECK ("bonus_boosters" >= 0);

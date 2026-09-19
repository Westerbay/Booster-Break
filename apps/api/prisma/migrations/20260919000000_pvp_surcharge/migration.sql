-- CreateEnum
CREATE TYPE "PvpMatchStatus" AS ENUM ('waiting', 'active', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "pvp_matches" (
    "id" TEXT NOT NULL,
    "challenger_id" TEXT NOT NULL,
    "opponent_id" TEXT NOT NULL,
    "status" "PvpMatchStatus" NOT NULL DEFAULT 'waiting',
    "state_json" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pvp_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pvp_seats" (
    "user_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,

    CONSTRAINT "pvp_seats_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "pvp_ratings" (
    "user_id" TEXT NOT NULL,
    "elo" INTEGER NOT NULL DEFAULT 1200,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pvp_ratings_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "pvp_card_stats" (
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pvp_card_stats_pkey" PRIMARY KEY ("user_id","card_id")
);

-- CreateTable
CREATE TABLE "pvp_results" (
    "match_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "elo_before" INTEGER NOT NULL,
    "elo_after" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pvp_results_pkey" PRIMARY KEY ("match_id","user_id")
);

-- CreateIndex
CREATE INDEX "pvp_matches_challenger_id_created_at_idx" ON "pvp_matches"("challenger_id", "created_at");

-- CreateIndex
CREATE INDEX "pvp_matches_opponent_id_status_created_at_idx" ON "pvp_matches"("opponent_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "pvp_matches_status_expires_at_idx" ON "pvp_matches"("status", "expires_at");

-- CreateIndex
CREATE INDEX "pvp_seats_match_id_idx" ON "pvp_seats"("match_id");

-- CreateIndex
CREATE INDEX "pvp_ratings_elo_wins_idx" ON "pvp_ratings"("elo", "wins");

-- CreateIndex
CREATE INDEX "pvp_card_stats_user_id_wins_idx" ON "pvp_card_stats"("user_id", "wins");

-- CreateIndex
CREATE INDEX "pvp_results_user_id_created_at_idx" ON "pvp_results"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "pvp_matches" ADD CONSTRAINT "pvp_matches_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_matches" ADD CONSTRAINT "pvp_matches_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_seats" ADD CONSTRAINT "pvp_seats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_seats" ADD CONSTRAINT "pvp_seats_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "pvp_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_ratings" ADD CONSTRAINT "pvp_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_card_stats" ADD CONSTRAINT "pvp_card_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_card_stats" ADD CONSTRAINT "pvp_card_stats_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "pokemon_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_results" ADD CONSTRAINT "pvp_results_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "pvp_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pvp_results" ADD CONSTRAINT "pvp_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

# Surcharge PvP

`Duels` opens the multiplayer lobby; `Dresseurs` / `Trainers` shows every trainer's Elo, signature
cards and individual record. The existing leaderboard retains collection rankings
and also offers an Elo ranking. The French/English rulebook is available in the
lobby, trainer directory and match screen through a book button opening a standard dialog.
The team picker uses the existing collection card component in a searchable dialog;
rarity and owned-finish filters run on the server before pagination. Trainer avatars,
ranks and scores share one row component across the directory, opponents and leaderboards.

Sending a challenge keeps team preparation in the arena page. The recipient gets
an invitation dialog across the application, including collection and leaderboard
screens, with accept and decline actions. Accept opens their team preparation;
the match starts only after the trio is confirmed. Closing the notification leaves
the invitation in the lobby and does not reopen it on subsequent polls during that
page session. Active trade notifications are shown first.

## Rules and persistence

- Three distinct owned Pokémon card IDs, with a total base power of at most six.
  Gifts count as ownership; the selected finish must be owned. No cards are staked
  or consumed. Teams are snapshotted when submitted.
- Printed HP determines power: up to 100 = 1, 101–180 = 2, above 180 = 3.
  Finishes do not affect strength. Incomplete or non-Pokémon catalog entries are
  ineligible.
- Five energy for the whole match; commit zero to three per round. Strength is
  base power + committed energy + one if a card's type matches an opponent's
  printed weakness. Each card plays once. A tied round consumes both cards and
  energy without awarding a point.
- Two won rounds or the higher score after three rounds wins the match. Equal
  final scores draw. Elo starts at 100. Expected score is
  `1 / (1 + 10 ** ((opponentElo - elo) / 400))`; the rating change is
  `round(24 * (score - expected))`, with score 1 / 0.5 / 0 for a win / draw / loss.
  The opponent receives the exact opposite change. The transfer is capped by the
  losing player's balance so neither rating becomes negative. At equal ratings a
  win transfers 12 points; a 1000-rated player beating a 1600-rated player gains
  23 points, while the expected winner gains 1. There is no randomness in Elo or
  battle resolution.
- Challenges expire after ten minutes. Both players have 90 seconds per round,
  including the previous reveal. The sole player with a sealed choice wins on
  timeout; if neither is ready the match is cancelled without Elo or card stats.
  Abandoning an active match forfeits it. Only resolved rounds in completed
  matches contribute card stats, grouped by owner and card ID across finishes.
- The API settles expired matches on participant reads or commands. No background
  worker is required. The client polls the lobby every three seconds and active
  matches every 1.5 seconds. Database state survives refreshes and API restarts.

The server checks ownership, energy, unused cards and membership; it sends only
the requesting player's hidden team and choice. PostgreSQL match/player locks,
unique seats and one transaction for settlement prevent concurrent matches and
duplicate Elo or card-stat updates. Animation is presentation only. The frontend
reuses the existing card renderer, buttons, query cache and shared clock; reduced
motion skips the effects and exposes results immediately.

## Migration and validation

The additive `20260919000000_pvp_surcharge` migration adds match, seat, rating,
result and card-stat tables. Apply it through the existing Prisma deployment
workflow to the intended environment before starting the new API.

For isolated database tests, explicitly select a disposable PostgreSQL database
on `localhost` or `127.0.0.1` whose name ends in `_test`. If no disposable
instance is already running, create one bound only to loopback:

```bash
docker run --rm --detach --name booster-pvp-local \
  --publish 127.0.0.1:55439:5432 \
  --env POSTGRES_HOST_AUTH_METHOD=trust \
  --env POSTGRES_DB=booster_pvp_test postgres:16-alpine
```

Then apply migrations and run the integration suite:

```bash
cd apps/api
DATABASE_URL='postgresql://postgres@127.0.0.1:55439/booster_pvp_test' bun run prisma:migrate:deploy
DATABASE_URL='postgresql://postgres@127.0.0.1:55439/booster_pvp_test' RUN_DATABASE_TESTS=true bun test tests/pvp
```

These tests cover private simultaneous choices, exact retries, concurrent
challenges, ownership including gifts, HTTP authorization/validation, draws,
timeouts, forfeits and transactional Elo/card-stat settlement. Regular `bun test`
also runs the pure battle tests and skips the database tests unless opted in.

## Local visual scenario

The same disposable database can be populated with six namespaced demo trainers.
The seed fetches actual card metadata and remote image URLs from TCGdex; all
trainer records are synthetic. It never runs during application startup.

```bash
cd apps/api
DATABASE_URL='postgresql://postgres@127.0.0.1:55439/booster_pvp_test' bun src/scripts/seed-pvp-demo.ts
```

Start the API with that same explicit `DATABASE_URL`, then start the web app with
`bun run dev:web`. At `http://127.0.0.1:5173`, use the existing local development
login with `pvp-demo-mathis`. Use a separate browser profile to log in as
`pvp-demo-alex`. In Duels, send a challenge, select Articuno, Bulbasaur and
Charizard ex (six points), accept with the second account and seal both choices.
Verify the reveal, replay, rules dialog, countdown, refresh/resume and final trainer directory.
The seed is idempotent and preserves any duels played with these demo accounts.
It also adds 30 completed synthetic matches over ten dates (ten matches per demo
trainer), with card snapshots and deterministic outcomes calculated by the actual
battle and Elo rules. These matches precede the oldest played match, and the
ratings join continuously onto existing history. Current Elo, lifetime win/loss
aggregates and card records are preserved; the initial aggregate stats represent
an earlier synthetic season, not only these ten matches. In Dresseurs, open any
of the six demo trainers to view their ten most recent Elo results. Card metadata
is reused locally on subsequent runs instead of fetched again.

To remove only the seeded history while preserving demo accounts and played duels:

```bash
DATABASE_URL='postgresql://postgres@127.0.0.1:55439/booster_pvp_test' bun src/scripts/seed-pvp-demo.ts --cleanup-history
```

Remove only this scenario, if desired:

```bash
DATABASE_URL='postgresql://postgres@127.0.0.1:55439/booster_pvp_test' bun src/scripts/seed-pvp-demo.ts --cleanup
```

Never point this seed or the integration tests at a shared or production database.

### Elo baseline migration

`20260921000000_pvp_elo_start_100` changes the default to 100 and subtracts 1100
from existing ratings and result history, clamping each value at zero. Wins, losses,
draws and matches are preserved. Historical deltas near the floor may shrink because
they are derived from the clamped before/after values. Earlier migrations are unchanged;
Prisma records this migration so subsequent deploys do not subtract again.

Deploy the migration with the matching application version while PvP writes are
stopped: it takes exclusive locks on ratings and results for an atomic conversion.
Do not run this SQL manually a second time or roll back only the application version.

`20260921010000_pvp_elo_nonnegative` then adds PostgreSQL `CHECK` constraints
to current Elo and both history values. Inserts and updates below zero are rejected,
including direct SQL writes. These constraints are maintained in migration SQL
because Prisma cannot represent them in its schema.

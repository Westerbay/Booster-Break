import { expect, test } from 'bun:test'
import { Client } from 'pg'

const databaseTest = Bun.env.RUN_DATABASE_TESTS === 'true' ? test : test.skip

databaseTest(
  'rebases legacy ratings and history, starts at 100 and rejects negative inserts or updates',
  async () => {
    const url = new URL(Bun.env.DATABASE_URL ?? 'https://invalid')
    if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !url.pathname.endsWith('_test'))
      throw new Error('Migration tests require a disposable loopback _test database')
    const client = new Client({ connectionString: url.href })
    await client.connect()
    try {
      // Temporary tables shadow the real tables on this connection only.
      await client.query(`
      CREATE TEMP TABLE pvp_ratings (elo integer NOT NULL DEFAULT 1200, wins integer DEFAULT 7);
      CREATE TEMP TABLE pvp_results (elo_before integer NOT NULL, elo_after integer NOT NULL);
      INSERT INTO pvp_ratings (elo) VALUES (0), (1080), (1100), (1200), (1212);
      INSERT INTO pvp_results VALUES (1200, 1212), (1105, 1093), (1080, 1092);
    `)
      const migration = await Bun.file(
        new URL(
          '../../prisma/migrations/20260921000000_pvp_elo_start_100/migration.sql',
          import.meta.url,
        ),
      ).text()
      await client.query(migration)
      await client.query(
        await Bun.file(
          new URL(
            '../../prisma/migrations/20260921010000_pvp_elo_nonnegative/migration.sql',
            import.meta.url,
          ),
        ).text(),
      )
      expect((await client.query('SELECT elo, wins FROM pvp_ratings ORDER BY elo')).rows).toEqual([
        { elo: 0, wins: 7 },
        { elo: 0, wins: 7 },
        { elo: 0, wins: 7 },
        { elo: 100, wins: 7 },
        { elo: 112, wins: 7 },
      ])
      expect((await client.query('SELECT * FROM pvp_results ORDER BY elo_before')).rows).toEqual([
        { elo_before: 0, elo_after: 0 },
        { elo_before: 5, elo_after: 0 },
        { elo_before: 100, elo_after: 112 },
      ])
      expect(
        (await client.query('INSERT INTO pvp_ratings DEFAULT VALUES RETURNING elo')).rows,
      ).toEqual([{ elo: 100 }])
      for (const statement of [
        'INSERT INTO pvp_ratings (elo) VALUES (-1)',
        'UPDATE pvp_ratings SET elo = -1',
        'INSERT INTO pvp_results VALUES (-1, 0)',
        'INSERT INTO pvp_results VALUES (0, -1)',
        'UPDATE pvp_results SET elo_before = -1',
        'UPDATE pvp_results SET elo_after = -1',
      ]) {
        await expect(client.query(statement)).rejects.toMatchObject({ code: '23514' })
      }
      await client.query('INSERT INTO pvp_ratings (elo) VALUES (0)')
      await client.query('INSERT INTO pvp_results VALUES (0, 0)')
    } finally {
      await client.end()
    }
  },
)

import { describe, expect, test } from 'bun:test'
import { buildEloChart } from './elo-chart'

describe('Elo history chart', () => {
  test('normalizes Eden Date values and ISO strings before plotting chronological results', () => {
    const chart = buildEloChart([
      { matchId: 'last', elo: 1230, change: 10, playedAt: new Date('2026-09-19T10:00:00Z') },
      { matchId: 'first', elo: 1210, change: 10, playedAt: '2026-09-19T11:00:00+02:00' },
      { matchId: 'middle', elo: 1220, change: 10, playedAt: new Date('2026-09-19T09:30:00Z') },
    ])

    expect(chart.points.map((point) => point.matchId)).toEqual(['first', 'middle', 'last'])
    expect(chart.points.map((point) => point.playedAt)).toEqual([
      '2026-09-19T09:00:00.000Z',
      '2026-09-19T09:30:00.000Z',
      '2026-09-19T10:00:00.000Z',
    ])
  })

  test('places real match results chronologically and higher ratings higher on the plot', () => {
    const history = [
      { matchId: 'last', elo: 1212, change: -12, playedAt: '2026-09-19T12:00:00Z' },
      { matchId: 'first', elo: 1210, change: 10, playedAt: '2026-09-17T12:00:00Z' },
      { matchId: 'peak', elo: 1224, change: 14, playedAt: '2026-09-18T12:00:00Z' },
    ]
    const chart = buildEloChart(history)

    expect(chart.points.map((point) => point.matchId)).toEqual(['first', 'peak', 'last'])
    expect(chart.points[0].x).toBeLessThan(chart.points[1].x)
    expect(chart.points[1].x).toBeLessThan(chart.points[2].x)
    expect(chart.points[1].y).toBeLessThan(chart.points[0].y)
    expect(chart.points[1].y).toBeLessThan(chart.points[2].y)
    expect(chart.points.every((point) => point.y > 0 && point.y < 100)).toBeTrue()
    expect(chart.points).toHaveLength(history.length)
    expect(history[0].matchId).toBe('last')
  })

  test('shows one real result as a centered point without inventing earlier matches', () => {
    const chart = buildEloChart([
      { matchId: 'only', elo: 1212, change: 12, playedAt: '2026-09-19T12:00:00Z' },
    ])

    expect(chart.points).toHaveLength(1)
    expect(chart.points[0].x).toBe(50)
    expect(Number.isFinite(chart.points[0].y)).toBeTrue()
    expect(chart.linePath).not.toContain('L')
  })

  test('does not create a misleading chart when no duel has been recorded', () => {
    const chart = buildEloChart([])

    expect(chart.points).toEqual([])
    expect(chart.ticks).toEqual([])
    expect(chart.linePath).toBe('')
  })

  test('keeps an unchanged Elo horizontal with a readable nonzero scale', () => {
    const chart = buildEloChart([
      { matchId: 'first', elo: 1200, change: 0, playedAt: '2026-09-18T12:00:00Z' },
      { matchId: 'second', elo: 1200, change: 0, playedAt: '2026-09-19T12:00:00Z' },
    ])

    expect(chart.points[0].y).toBe(chart.points[1].y)
    expect(
      chart.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)),
    ).toBeTrue()
    expect(chart.ticks[0].value).toBeGreaterThan(1200)
    expect(chart.ticks.at(-1)?.value).toBeLessThan(1200)
  })
})

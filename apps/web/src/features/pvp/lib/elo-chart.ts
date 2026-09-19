import type { PvpTrainerDetail } from '@tcg-collection/shared'

type EloHistoryEntry = Omit<PvpTrainerDetail['history'][number], 'playedAt'> & {
  playedAt: string | Date
}

/** Match order is evenly spaced; Elo values retain their actual relative scale. */
export function buildEloChart(history: readonly EloHistoryEntry[]) {
  if (history.length === 0) return { points: [], ticks: [], linePath: '' }
  // Eden rehydrates date strings at runtime. Normalize here so SVG labels and
  // semantic <time> values share the same stable representation.
  const ordered = history
    .map((entry) => ({ ...entry, playedAt: new Date(entry.playedAt).toISOString() }))
    .sort(
      (first, second) => new Date(first.playedAt).getTime() - new Date(second.playedAt).getTime(),
    )
  const ratings = ordered.map((entry) => entry.elo)
  const low = Math.min(...ratings)
  const high = Math.max(...ratings)
  const padding = Math.max(10, (high - low) * 0.15)
  const minimum = Math.floor((low - padding) / 10) * 10
  const maximum = Math.ceil((high + padding) / 10) * 10
  const points = ordered.map((entry, index) => ({
    ...entry,
    x: ordered.length === 1 ? 50 : (index / (ordered.length - 1)) * 100,
    y: ((maximum - entry.elo) / (maximum - minimum)) * 100,
  }))
  const ticks = [maximum, (maximum + minimum) / 2, minimum].map((value) => ({
    value,
    y: ((maximum - value) / (maximum - minimum)) * 100,
  }))
  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return { points, ticks, linePath }
}

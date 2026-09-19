import { useId } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import type { PvpTrainerDetail } from '@tcg-collection/shared'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'
import { buildEloChart } from '../lib/elo-chart'
import '@/styles/elo-history-chart.css'

export function EloHistoryChart({ history }: { history: PvpTrainerDetail['history'] }) {
  const gradientId = useId()
  const { locale } = useLocale()
  const chart = buildEloChart(history)
  const first = chart.points[0]
  const last = chart.points.at(-1)
  if (!first || !last) return <p className="arena-empty">{m.pvp_history_empty()}</p>

  const number = new Intl.NumberFormat(locale)
  const signedNumber = new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' })
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })
  const fullDate = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const change = last.elo - first.elo
  const isSingle = chart.points.length === 1
  const label = m.pvp_elo_chart_label({
    first: number.format(first.elo),
    last: number.format(last.elo),
    count: chart.points.length,
  })
  const datePoints = isSingle ? [first] : [first, last]
  if (chart.points.length > 3)
    datePoints.splice(1, 0, chart.points[Math.floor(chart.points.length / 2)])
  const areaPath = `${chart.linePath} L 100 100 L 0 100 Z`
  const gradientFill = `url(#${gradientId})`

  return (
    <figure className="elo-history-chart">
      <figcaption className="elo-chart-caption">
        <span>{isSingle ? m.pvp_elo_chart_single() : m.pvp_elo_chart_hint()}</span>
        {!isSingle && (
          <strong data-positive={change >= 0}>
            {m.pvp_elo_chart_change({ change: signedNumber.format(change) })}
          </strong>
        )}
      </figcaption>
      <div className="elo-chart-frame">
        <div className="elo-chart-axis" aria-hidden="true">
          {chart.ticks.map((tick) => {
            const position = { top: `${tick.y}%` }
            return (
              <span key={tick.value} style={position}>
                {number.format(tick.value)}
              </span>
            )
          })}
        </div>
        <div className="elo-chart-plot">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label}>
            <defs>
              <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--arena-gold)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--arena-gold)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {chart.ticks.map((tick) => (
              <line
                className="elo-chart-gridline"
                key={tick.value}
                x1="0"
                x2="100"
                y1={tick.y}
                y2={tick.y}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {!isSingle && <path d={areaPath} fill={gradientFill} />}
            <path className="elo-chart-line" d={chart.linePath} vectorEffect="non-scaling-stroke" />
          </svg>
          {chart.points.map((point) => {
            const position = { left: `${point.x}%`, top: `${point.y}%` }
            const description = `${fullDate.format(new Date(point.playedAt))} · ${number.format(point.elo)} Elo (${signedNumber.format(point.change)})`
            return (
              <span
                className="elo-chart-point"
                data-latest={point.matchId === last.matchId}
                key={point.matchId}
                style={position}
                title={description}
                aria-hidden="true"
              >
                {point.matchId === last.matchId && (
                  <strong className="elo-chart-latest">{number.format(point.elo)}</strong>
                )}
              </span>
            )
          })}
        </div>
        <div className="elo-chart-dates" aria-hidden="true">
          {datePoints.map((point) => {
            const position = { left: `${point.x}%` }
            return (
              <time
                key={point.matchId}
                style={position}
                dateTime={point.playedAt}
                data-position={point.x}
                data-middle={point.matchId !== first.matchId && point.matchId !== last.matchId}
              >
                {date.format(new Date(point.playedAt))}
              </time>
            )
          })}
        </div>
      </div>
      <details className="elo-chart-records">
        <summary>
          {m.pvp_elo_chart_details()}
          <ChevronDownIcon aria-hidden="true" />
        </summary>
        <table>
          <thead>
            <tr>
              <th scope="col">{m.pvp_elo_chart_date()}</th>
              <th scope="col">Elo</th>
              <th scope="col">{m.pvp_elo_chart_delta()}</th>
            </tr>
          </thead>
          <tbody>
            {chart.points.map((point) => (
              <tr key={point.matchId}>
                <td>
                  <time dateTime={point.playedAt}>{fullDate.format(new Date(point.playedAt))}</time>
                </td>
                <td>{number.format(point.elo)}</td>
                <td data-positive={point.change >= 0}>{signedNumber.format(point.change)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}

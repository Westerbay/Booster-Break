import type { ComponentType, SVGProps } from 'react'
import type { LeaderboardEntry } from '../lib/leaderboard-config'

import type { LeaderboardKind } from '../lib/leaderboard-config'
import { LeaderboardList } from './LeaderboardList'
import { LeaderboardSelector } from './LeaderboardSelector'
import { LeaderboardPodium } from './LeaderboardPodium'

interface LeaderboardPanelProps {
  title: string
  description: string
  scoreLabel: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  players: LeaderboardEntry[]
  currentUserId?: string
  isPending: boolean
  numberFormatter: Intl.NumberFormat
  activeLeaderboard: LeaderboardKind
  onLeaderboardChange: (leaderboard: LeaderboardKind) => void
}

export function LeaderboardPanel({
  title,
  description,
  scoreLabel,
  icon: Icon,
  players,
  currentUserId,
  isPending,
  numberFormatter,
  activeLeaderboard,
  onLeaderboardChange,
}: LeaderboardPanelProps) {
  return (
    <section className="leaderboard-panel" aria-busy={isPending}>
      <div className="leaderboard-panel-toolbar">
        <div className="leaderboard-panel-heading">
          <Icon aria-hidden="true" />
          <div>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <LeaderboardSelector
          activeLeaderboard={activeLeaderboard}
          onLeaderboardChange={onLeaderboardChange}
        />
      </div>

      {isPending ? (
        <div className="leaderboard-loading" aria-hidden="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="leaderboard-loading-row">
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : (
        <>
          {players.length > 0 && (
            <LeaderboardPodium
              players={players}
              scoreLabel={scoreLabel}
              numberFormatter={numberFormatter}
              currentUserId={currentUserId}
            />
          )}
          <LeaderboardList
            players={players}
            currentUserId={currentUserId}
            scoreLabel={scoreLabel}
            numberFormatter={numberFormatter}
          />
        </>
      )}
    </section>
  )
}

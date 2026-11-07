import { m } from '@/paraglide/messages'
import type { LeaderboardEntry, LeaderboardKind } from '../lib/leaderboard-config'
import { LeaderboardList } from './LeaderboardList'
import { LeaderboardSelector } from './LeaderboardSelector'
import { LeaderboardPodium } from './LeaderboardPodium'

interface LeaderboardPanelProps {
  scoreLabel: string
  players: LeaderboardEntry[]
  currentUserId?: string
  isPending: boolean
  numberFormatter: Intl.NumberFormat
  activeLeaderboard: LeaderboardKind
  onLeaderboardChange: (leaderboard: LeaderboardKind) => void
}

export function LeaderboardPanel({
  scoreLabel,
  players,
  currentUserId,
  isPending,
  numberFormatter,
  activeLeaderboard,
  onLeaderboardChange,
}: LeaderboardPanelProps) {
  const finalists = players.slice(0, 3)
  const remainingPlayers = players.slice(finalists.length)

  return (
    <div className="leaderboard-panel" aria-busy={isPending}>
      <LeaderboardSelector
        activeLeaderboard={activeLeaderboard}
        onLeaderboardChange={onLeaderboardChange}
      />
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
      ) : players.length === 0 ? (
        <p className="leaderboard-empty">{m.leaderboard_empty()}</p>
      ) : (
        <>
          <LeaderboardPodium
            players={finalists}
            scoreLabel={scoreLabel}
            numberFormatter={numberFormatter}
            currentUserId={currentUserId}
          />
          {remainingPlayers.length > 0 && (
            <LeaderboardList
              players={remainingPlayers}
              startRank={finalists.length + 1}
              scoreLabel={scoreLabel}
              numberFormatter={numberFormatter}
              currentUserId={currentUserId}
            />
          )}
        </>
      )}
    </div>
  )
}

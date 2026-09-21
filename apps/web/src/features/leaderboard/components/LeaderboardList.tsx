import type { LeaderboardEntry } from '../lib/leaderboard-config'
import { TrainerRow } from '@/features/trainers/components/TrainerRow'

interface LeaderboardListProps {
  players: LeaderboardEntry[]
  scoreLabel: string
  emptyMessage: string
  numberFormatter: Intl.NumberFormat
  currentUserId?: string
}

export function LeaderboardList({
  players,
  scoreLabel,
  emptyMessage,
  numberFormatter,
  currentUserId,
}: LeaderboardListProps) {
  if (players.length === 0) return <p className="leaderboard-empty">{emptyMessage}</p>
  return (
    <ol className="leaderboard-roster">
      {players.map((player, index) => (
        <li key={player.userId}>
          <TrainerRow
            trainer={player}
            rank={index + 1}
            score={numberFormatter.format(player.score)}
            scoreLabel={scoreLabel}
            isSelf={player.userId === currentUserId}
          />
        </li>
      ))}
    </ol>
  )
}

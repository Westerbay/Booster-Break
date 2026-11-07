import type { LeaderboardEntry } from '../lib/leaderboard-config'
import { TrainerRow } from '@/features/trainers/components/TrainerRow'

interface LeaderboardListProps {
  players: LeaderboardEntry[]
  startRank: number
  scoreLabel: string
  numberFormatter: Intl.NumberFormat
  currentUserId?: string
}

export function LeaderboardList({
  players,
  startRank,
  scoreLabel,
  numberFormatter,
  currentUserId,
}: LeaderboardListProps) {
  return (
    <ol className="leaderboard-roster" start={startRank} role="list">
      {players.map((player, index) => (
        <li key={player.userId}>
          <TrainerRow
            trainer={player}
            rank={startRank + index}
            score={numberFormatter.format(player.score)}
            scoreLabel={scoreLabel}
            isSelf={player.userId === currentUserId}
          />
        </li>
      ))}
    </ol>
  )
}

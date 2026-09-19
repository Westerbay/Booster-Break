import type { LeaderboardEntry } from '../lib/leaderboard-config'
import { TrainerRow } from '@/features/trainers/components/TrainerRow'
import { m } from '@/paraglide/messages'

interface LeaderboardListProps {
  players: LeaderboardEntry[]
  scoreLabel: string
  numberFormatter: Intl.NumberFormat
  currentUserId?: string
}

export function LeaderboardList({
  players,
  scoreLabel,
  numberFormatter,
  currentUserId,
}: LeaderboardListProps) {
  if (players.length === 0) return <p className="leaderboard-empty">{m.leaderboard_empty()}</p>
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

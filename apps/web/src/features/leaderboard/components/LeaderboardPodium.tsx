import { ArenaBackdrop } from '@/components/game/ArenaBackdrop'
import { RankBadge } from '@/features/trainers/components/RankBadge'
import { TrainerAvatar } from '@/features/trainers/components/TrainerAvatar'
import { m } from '@/paraglide/messages'
import type { LeaderboardEntry } from '../lib/leaderboard-config'

interface LeaderboardPodiumProps {
  players: LeaderboardEntry[]
  scoreLabel: string
  numberFormatter: Intl.NumberFormat
  currentUserId?: string
}

export function LeaderboardPodium({
  players,
  scoreLabel,
  numberFormatter,
  currentUserId,
}: LeaderboardPodiumProps) {
  return (
    <div
      className="leaderboard-podium"
      data-count={players.length}
      role="group"
      aria-label={m.pvp_podium()}
    >
      <ArenaBackdrop />
      {players.map((player, index) => (
        <div className="leaderboard-finalist" data-rank={index + 1} key={player.userId}>
          <div className="leaderboard-finalist-portrait">
            <TrainerAvatar name={player.name} avatarUrl={player.avatarUrl} />
            <RankBadge rank={index + 1} />
          </div>
          <div className="leaderboard-finalist-identity">
            <strong className="leaderboard-finalist-name" title={player.name}>
              {player.name}
            </strong>
            {player.userId === currentUserId && (
              <span className="leaderboard-finalist-self">{m.pvp_you()}</span>
            )}
          </div>
          <div className="leaderboard-finalist-result">
            <strong className="leaderboard-finalist-score">
              {numberFormatter.format(player.score)}
            </strong>
            <small>{scoreLabel}</small>
          </div>
        </div>
      ))}
    </div>
  )
}

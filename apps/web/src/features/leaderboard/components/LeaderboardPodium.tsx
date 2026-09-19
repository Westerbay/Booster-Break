import { CrownIcon } from 'lucide-react'

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
    <div className="leaderboard-podium" role="group" aria-label={m.pvp_podium()}>
      {players.slice(0, 3).map((player, index) => (
        <div className="leaderboard-finalist" data-rank={index + 1} key={player.userId}>
          <div className="leaderboard-finalist-portrait">
            {index === 0 && <CrownIcon className="leaderboard-crown" aria-hidden="true" />}
            <TrainerAvatar name={player.name} avatarUrl={player.avatarUrl} />
            <RankBadge rank={index + 1} />
          </div>
          <div className="leaderboard-finalist-plinth">
            <strong className="leaderboard-finalist-name">{player.name}</strong>
            {player.userId === currentUserId && (
              <span className="leaderboard-finalist-self">{m.pvp_you()}</span>
            )}
            <span className="leaderboard-finalist-score">
              {numberFormatter.format(player.score)}
            </span>
            <small>{scoreLabel}</small>
          </div>
        </div>
      ))}
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'
import {
  getLeaderboardConfig,
  leaderboardOptions,
  type LeaderboardKind,
} from '../lib/leaderboard-config'

interface LeaderboardSelectorProps {
  activeLeaderboard: LeaderboardKind
  onLeaderboardChange: (leaderboard: LeaderboardKind) => void
}

export function LeaderboardSelector({
  activeLeaderboard,
  onLeaderboardChange,
}: LeaderboardSelectorProps) {
  return (
    <div className="leaderboard-selector" role="group" aria-label={m.leaderboard_select_label()}>
      {leaderboardOptions.map((option) => {
        const { title, icon: Icon } = getLeaderboardConfig(option)
        return (
          <Button
            key={option}
            type="button"
            variant="ghost"
            aria-pressed={option === activeLeaderboard}
            onClick={() => onLeaderboardChange(option)}
          >
            <Icon aria-hidden="true" />
            <span>{title}</span>
          </Button>
        )
      })}
    </div>
  )
}

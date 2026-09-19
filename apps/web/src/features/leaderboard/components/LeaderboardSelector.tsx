import { ChevronDownIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const activeLabel = getLeaderboardConfig(activeLeaderboard).title
  function handleLeaderboardChange(nextLeaderboard: string) {
    onLeaderboardChange(nextLeaderboard as LeaderboardKind)
  }

  return (
    <div className="leaderboard-selector">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={m.leaderboard_select_label()}
          className="leaderboard-selector-trigger"
        >
          <span>
            <small>{m.leaderboard_select_label()}</small>
            <strong>{activeLabel}</strong>
          </span>
          <ChevronDownIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="w-64">
          <DropdownMenuRadioGroup value={activeLeaderboard} onValueChange={handleLeaderboardChange}>
            {leaderboardOptions.map((leaderboardOption) => {
              const optionConfig = getLeaderboardConfig(leaderboardOption)

              return (
                <DropdownMenuRadioItem
                  key={leaderboardOption}
                  value={leaderboardOption}
                  closeOnClick
                  label={optionConfig.title}
                  className="min-h-11 cursor-pointer px-2.5"
                >
                  <span>{optionConfig.title}</span>
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

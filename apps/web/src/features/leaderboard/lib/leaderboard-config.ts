import { CrownIcon, Layers3Icon } from 'lucide-react'
import type { LeaderboardPlayer } from '@tcg-collection/shared'

import { m } from '@/paraglide/messages'

export const leaderboardOptions = ['mostUniqueCards', 'mostCards'] as const
export type LeaderboardKind = (typeof leaderboardOptions)[number]
export type LeaderboardEntry = Pick<LeaderboardPlayer, 'userId' | 'name' | 'avatarUrl'> & {
  score: number
}

export const getLeaderboardConfig = (kind: LeaderboardKind) => {
  switch (kind) {
    case 'mostCards':
      return {
        title: m.leaderboard_most_cards_title(),
        scoreLabel: m.leaderboard_total_cards_label(),
        icon: Layers3Icon,
      }
    case 'mostUniqueCards':
      return {
        title: m.leaderboard_most_unique_title(),
        scoreLabel: m.leaderboard_unique_cards_label(),
        icon: CrownIcon,
      }
  }
}

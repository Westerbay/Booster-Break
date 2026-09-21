import { CrownIcon, Layers3Icon, SwordsIcon } from 'lucide-react'
import type { LeaderboardPlayer } from '@tcg-collection/shared'

import { m } from '@/paraglide/messages'

export type LeaderboardKind = 'mostUniqueCards' | 'mostCards' | 'elo'
export type LeaderboardEntry = Pick<LeaderboardPlayer, 'userId' | 'name' | 'avatarUrl'> & {
  score: number
}

export const leaderboardOptions: LeaderboardKind[] = ['elo', 'mostUniqueCards', 'mostCards']

export const getLeaderboardConfig = (kind: LeaderboardKind) => {
  switch (kind) {
    case 'elo':
      return {
        title: m.pvp_elo_leaderboard_title(),
        description: m.pvp_elo_leaderboard_description(),
        scoreLabel: 'Elo',
        emptyMessage: m.pvp_no_trainers(),
        icon: SwordsIcon,
      }
    case 'mostCards':
      return {
        title: m.leaderboard_most_cards_title(),
        description: m.leaderboard_most_cards_description(),
        scoreLabel: m.leaderboard_total_cards_label(),
        emptyMessage: m.leaderboard_empty(),
        icon: Layers3Icon,
      }
    case 'mostUniqueCards':
      return {
        title: m.leaderboard_most_unique_title(),
        description: m.leaderboard_most_unique_description(),
        scoreLabel: m.leaderboard_unique_cards_label(),
        emptyMessage: m.leaderboard_empty(),
        icon: CrownIcon,
      }
  }
}

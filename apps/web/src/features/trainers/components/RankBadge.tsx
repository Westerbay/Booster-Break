import { CrownIcon, MedalIcon } from 'lucide-react'

import { m } from '@/paraglide/messages'

export function RankBadge({ rank }: { rank: number }) {
  let label: string | undefined
  if (rank === 1) label = m.leaderboard_rank_first()
  if (rank === 2) label = m.leaderboard_rank_second()
  if (rank === 3) label = m.leaderboard_rank_third()
  const Icon = rank === 1 ? CrownIcon : MedalIcon

  return (
    <span className="trainer-rank-badge" data-rank={rank}>
      {rank <= 3 && <Icon aria-hidden="true" />}
      <span aria-hidden={Boolean(label)}>{String(rank).padStart(2, '0')}</span>
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

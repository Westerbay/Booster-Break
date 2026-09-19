import { ShieldIcon, TrophyIcon } from 'lucide-react'

import { m } from '@/paraglide/messages'

export function LeaderboardHeader() {
  return (
    <header className="leaderboard-header">
      <div className="leaderboard-header-copy">
        <p className="arena-eyebrow">{m.leaderboard_eyebrow()}</p>
        <h1>{m.leaderboard_title()}</h1>
        <p className="leaderboard-intro">{m.leaderboard_description()}</p>
      </div>
      <div className="leaderboard-emblem" aria-hidden="true">
        <ShieldIcon className="leaderboard-emblem-shield" strokeWidth={0.7} />
        <TrophyIcon className="leaderboard-emblem-trophy" strokeWidth={1.4} />
      </div>
    </header>
  )
}

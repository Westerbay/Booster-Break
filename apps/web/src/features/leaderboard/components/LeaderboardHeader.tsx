import { TrophyIcon } from 'lucide-react'

import { m } from '@/paraglide/messages'

export function LeaderboardHeader() {
  return (
    <header className="game-index-heading">
      <div className="game-index-emblem" aria-hidden="true">
        <TrophyIcon />
      </div>
      <div className="game-index-heading-copy">
        <p className="arena-eyebrow">{m.leaderboard_eyebrow()}</p>
        <h1 id="leaderboard-title">{m.leaderboard_title()}</h1>
        <p className="game-index-intro">{m.leaderboard_description()}</p>
      </div>
    </header>
  )
}

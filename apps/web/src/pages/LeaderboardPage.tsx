import { LeaderboardHeader } from '@/features/leaderboard/components/LeaderboardHeader'
import { LeaderboardPanel } from '@/features/leaderboard/components/LeaderboardPanel'
import { useLeaderboardPage } from '@/features/leaderboard/hooks/useLeaderboardPage'
import { m } from '@/paraglide/messages'

export function LeaderboardPage() {
  const {
    activeConfig,
    activeLeaderboard,
    auth,
    leaderboard,
    numberFormatter,
    players,
    setActiveLeaderboard,
  } = useLeaderboardPage()

  return (
    <section
      className="leaderboard-board game-panel game-index-panel w-full min-w-0"
      aria-labelledby="leaderboard-title"
    >
      <LeaderboardHeader />

      {leaderboard.error ? (
        <p className="leaderboard-empty text-destructive" role="alert">
          {m.leaderboard_load_error()}
        </p>
      ) : (
        <LeaderboardPanel
          scoreLabel={activeConfig.scoreLabel}
          players={players}
          currentUserId={auth.data?.authenticated ? auth.data.user.id : undefined}
          isPending={leaderboard.isPending}
          numberFormatter={numberFormatter}
          activeLeaderboard={activeLeaderboard}
          onLeaderboardChange={setActiveLeaderboard}
        />
      )}
    </section>
  )
}

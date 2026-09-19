import { useQuery } from '@tanstack/react-query'
import { ArrowLeftIcon, CrownIcon, SwordsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/features/i18n/useLocale'
import { pvpTrainerOptions } from '@/lib/queries/pvp'
import { m } from '@/paraglide/messages'
import { TrainerAvatar } from '@/features/trainers/components/TrainerAvatar'
import { RankBadge } from '@/features/trainers/components/RankBadge'
import { CardPreview } from '@/features/dashboard/components/CardPreview'
import { BattleCardImage } from './BattleCardImage'
import { ArenaBackdrop } from '@/components/game/ArenaBackdrop'
import { EloHistoryChart } from './EloHistoryChart'

export function TrainerProfile({
  userId,
  currentUserId,
  onBack,
  onChallenge,
}: {
  userId: string
  currentUserId?: string
  onBack: () => void
  onChallenge: (id: string) => void
}) {
  const { locale } = useLocale()
  const query = useQuery(pvpTrainerOptions(userId))
  function retry() {
    void query.refetch()
  }
  function challenge() {
    onChallenge(userId)
  }
  const trainer = query.data?.trainer
  const matches = trainer ? trainer.wins + trainer.losses + trainer.draws : 0
  const trophyCards = trainer?.topCards.slice(0, 3) ?? []
  return (
    <section className="pvp arena-profile">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon data-icon="inline-start" />
        {m.pvp_all_trainers()}
      </Button>
      {query.isPending && <p role="status">{m.pvp_loading()}</p>}
      {query.error && (
        <div role="alert" className="arena-error">
          <p>{query.error.message}</p>
          <Button onClick={retry}>{m.pvp_retry()}</Button>
        </div>
      )}
      {trainer && (
        <>
          <header className="arena-page-header">
            <div>
              <p className="arena-eyebrow">{m.pvp_rank({ rank: trainer.rank })}</p>
              <div className="flex items-center gap-3">
                <TrainerAvatar
                  name={trainer.name}
                  avatarUrl={trainer.avatarUrl}
                  className="size-14"
                />
                <h1>{trainer.name}</h1>
              </div>
            </div>
            <div className="arena-profile-elo">
              <strong>{trainer.elo.toLocaleString(locale)}</strong>
              <span>Elo</span>
            </div>
          </header>
          <dl className="arena-profile-stats">
            <div>
              <dt>{m.pvp_matches()}</dt>
              <dd>{matches}</dd>
            </div>
            <div>
              <dt>{m.pvp_wins()}</dt>
              <dd>{trainer.wins}</dd>
            </div>
            <div>
              <dt>{m.pvp_win_rate()}</dt>
              <dd>{matches ? Math.round((trainer.wins / matches) * 100) : 0}%</dd>
            </div>
            <div>
              <dt>
                {m.pvp_losses()} / {m.pvp_draws()}
              </dt>
              <dd>
                {trainer.losses} / {trainer.draws}
              </dd>
            </div>
          </dl>
          <div className="arena-section-title">
            <h2>{m.pvp_top_cards()}</h2>
            {currentUserId && currentUserId !== userId && (
              <Button onClick={challenge}>
                <SwordsIcon data-icon="inline-start" />
                {m.pvp_challenge({ name: trainer.name })}
              </Button>
            )}
          </div>
          {trophyCards.length > 0 ? (
            <div className="trainer-card-podium" data-count={trophyCards.length}>
              <ArenaBackdrop />
              {trophyCards.map((record, index) => (
                <article className="trainer-card-trophy" key={record.card.id} data-rank={index + 1}>
                  <div className="trainer-card-trophy-art">
                    {index === 0 && (
                      <CrownIcon className="trainer-card-trophy-crown" aria-hidden="true" />
                    )}
                    <CardPreview card={record.card}>
                      <BattleCardImage card={record.card} />
                    </CardPreview>
                  </div>
                  <div className="trainer-card-trophy-step">
                    <RankBadge rank={index + 1} />
                    <h3>{record.card.name}</h3>
                    <p>{m.pvp_card_wins({ count: record.wins })}</p>
                    {index === 0 && <small>{m.pvp_signature()}</small>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="arena-empty">{m.pvp_no_cards()}</p>
          )}
          <div className="arena-section-title">
            <h2>{m.pvp_elo_history()}</h2>
            <span>{m.pvp_last_matches()}</span>
          </div>
          <EloHistoryChart history={query.data?.history ?? []} />
        </>
      )}
    </section>
  )
}

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CrownIcon, SwordsIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/features/i18n/useLocale'
import { pvpBoardOptions, pvpTrainerOptions } from '@/lib/queries/pvp'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { m } from '@/paraglide/messages'
import { CardTrio } from '../components/CardTrio'
import { TrainerBanner } from '../components/TrainerBanner'
import { TrainerProfile } from '../components/TrainerProfile'
import { TrainerAvatar } from '@/features/trainers/components/TrainerAvatar'
import { ArenaRules } from '../components/ArenaRules'
import { ArenaBackdrop } from '@/components/game/ArenaBackdrop'

export function BoardView({ onEnter }: { onEnter: (opponentId?: string) => void }) {
  const { locale } = useLocale()
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string | null>(null)
  const board = useQuery(pvpBoardOptions(page, true))
  const auth = useQuery(useCurrentUserQueryOption())
  const userId = auth.data?.authenticated ? auth.data.user.id : undefined
  const self = useQuery({ ...pvpTrainerOptions(userId ?? ''), enabled: Boolean(userId) })
  function enter() {
    onEnter()
  }
  function back() {
    setSelected(null)
  }
  function retry() {
    void board.refetch()
  }
  function previous() {
    setPage((page) => page - 1)
  }
  function next() {
    setPage((page) => page + 1)
  }
  if (selected)
    return (
      <TrainerProfile
        userId={selected}
        currentUserId={userId}
        onBack={back}
        onChallenge={onEnter}
      />
    )
  const trainers = board.data?.trainers ?? []
  const selfTrainer = self.data?.trainer
  const unrankedSelf =
    selfTrainer &&
    selfTrainer.wins + selfTrainer.losses + selfTrainer.draws === 0 &&
    board.data &&
    page * board.data.pageSize >= board.data.total &&
    !trainers.some((trainer) => trainer.userId === selfTrainer.userId)
      ? selfTrainer
      : undefined
  const podium = [trainers[1], trainers[0], trainers[2]].filter((trainer) => trainer !== undefined)
  return (
    <section className="pvp arena-board">
      <header className="arena-page-header">
        <div>
          <p className="arena-eyebrow">{m.pvp_board_eyebrow()}</p>
          <h1>{m.pvp_board_title()}</h1>
          <p>{m.pvp_board_subtitle()}</p>
        </div>
        <div className="flex items-center gap-2">
          <ArenaRules />
          <Button size="lg" onClick={enter}>
            <SwordsIcon data-icon="inline-start" />
            {m.pvp_enter()}
          </Button>
        </div>
      </header>
      {board.isPending && (
        <p role="status" className="arena-empty">
          {m.pvp_loading()}
        </p>
      )}
      {board.error && (
        <div role="alert" className="arena-error">
          <p>{board.error.message}</p>
          <Button onClick={retry}>{m.pvp_retry()}</Button>
        </div>
      )}
      {page === 1 && podium.length > 0 && (
        <div className="arena-hall">
          <ArenaBackdrop />
          <div className="arena-hall-label">
            <span>{m.pvp_podium()}</span>
            <span>{m.pvp_top_cards()}</span>
          </div>
          <div className="arena-podium">
            {podium.map((trainer) => {
              const cards = trainer.topCards.map((record) => record.card)
              function select() {
                setSelected(trainer.userId)
              }
              return (
                <div
                  className="arena-podium-person"
                  data-first={trainer.rank === 1}
                  key={trainer.userId}
                >
                  <button
                    className="arena-podium-select"
                    type="button"
                    onClick={select}
                    aria-label={m.pvp_record_open({ name: trainer.name })}
                  />
                  <span className="arena-podium-rank">
                    {trainer.rank === 1 && <CrownIcon aria-hidden="true" />}
                    {m.pvp_rank({ rank: trainer.rank })}
                  </span>
                  <CardTrio cards={cards} />
                  <span className="arena-podium-info">
                    <TrainerAvatar
                      name={trainer.name}
                      avatarUrl={trainer.avatarUrl}
                      className="mx-auto mb-2"
                    />
                    <strong>{trainer.name}</strong>
                    <span>{trainer.elo.toLocaleString(locale)} Elo</span>
                    <small>
                      {m.pvp_record({
                        wins: trainer.wins,
                        losses: trainer.losses,
                        draws: trainer.draws,
                      })}
                    </small>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <div className="arena-section-title">
        <h2>{m.pvp_all_trainers()}</h2>
        <span>{m.pvp_trainers_count({ count: board.data?.total ?? 0 })}</span>
      </div>
      <div className="arena-roster">
        {trainers.map((trainer) => (
          <TrainerBanner
            key={trainer.userId}
            trainer={trainer}
            isSelf={trainer.userId === userId}
            onSelect={setSelected}
          />
        ))}
        {unrankedSelf && <TrainerBanner trainer={unrankedSelf} isSelf onSelect={setSelected} />}
      </div>
      {!board.isPending && !board.error && !trainers.length && !unrankedSelf && (
        <p className="arena-empty">{m.pvp_no_trainers()}</p>
      )}
      {board.data && board.data.total > board.data.pageSize && (
        <nav className="arena-pagination" aria-label={m.pvp_all_trainers()}>
          <Button variant="outline" disabled={page === 1} onClick={previous}>
            {m.pvp_previous()}
          </Button>
          <span>
            {page} / {Math.ceil(board.data.total / board.data.pageSize)}
          </span>
          <Button
            variant="outline"
            disabled={page * board.data.pageSize >= board.data.total}
            onClick={next}
          >
            {m.pvp_next()}
          </Button>
        </nav>
      )}
    </section>
  )
}

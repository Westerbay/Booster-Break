import { ArrowUpRightIcon, SwordsIcon } from 'lucide-react'
import type { PvpBoardTrainer } from '@tcg-collection/shared'
import { useLocale } from '@/features/i18n/useLocale'
import { TrainerRow } from '@/features/trainers/components/TrainerRow'
import { m } from '@/paraglide/messages'
import { CardTrio } from './CardTrio'

export function TrainerBanner({
  trainer,
  isSelf = false,
  onSelect,
  challenge = false,
  disabled = false,
}: {
  trainer: PvpBoardTrainer
  isSelf?: boolean
  onSelect: (id: string) => void
  challenge?: boolean
  disabled?: boolean
}) {
  const { locale } = useLocale()
  const count = trainer.wins + trainer.losses + trainer.draws
  const rate = count ? Math.round((trainer.wins / count) * 100) : 0
  function handleSelect() {
    onSelect(trainer.userId)
  }
  return (
    <TrainerRow
      trainer={trainer}
      rank={trainer.rank}
      score={trainer.elo.toLocaleString(locale)}
      scoreLabel="Elo"
      isSelf={isSelf}
      onSelect={handleSelect}
      disabled={disabled}
      actionLabel={
        challenge
          ? m.pvp_challenge({ name: trainer.name })
          : m.pvp_record_open({ name: trainer.name })
      }
      action={challenge ? <SwordsIcon /> : <ArrowUpRightIcon />}
      detail={m.pvp_record({ wins: trainer.wins, losses: trainer.losses, draws: trainer.draws })}
    >
      <span className="trainer-win-rate">
        <strong>{rate}%</strong>
        <small>{m.pvp_wins()}</small>
      </span>
      {trainer.topCards.length > 0 && (
        <CardTrio cards={trainer.topCards.map((record) => record.card)} />
      )}
    </TrainerRow>
  )
}

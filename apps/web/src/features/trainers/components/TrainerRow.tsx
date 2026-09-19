import type { ReactNode } from 'react'
import { m } from '@/paraglide/messages'
import { TrainerAvatar } from './TrainerAvatar'
import { RankBadge } from './RankBadge'

interface TrainerRowProps {
  trainer: { name: string; avatarUrl?: string | null }
  rank: number
  score: string
  scoreLabel: string
  isSelf?: boolean
  detail?: ReactNode
  children?: ReactNode
  action?: ReactNode
  actionLabel?: string
  disabled?: boolean
  onSelect?: () => void
}

/** Shared identity and score layout for the directory, opponents and rankings. */
export function TrainerRow({
  trainer,
  rank,
  score,
  scoreLabel,
  isSelf,
  detail,
  children,
  action,
  actionLabel,
  disabled,
  onSelect,
}: TrainerRowProps) {
  const content = (
    <>
      <span className="trainer-row-rank">
        <RankBadge rank={rank} />
      </span>
      <span className="trainer-row-identity">
        <TrainerAvatar name={trainer.name} avatarUrl={trainer.avatarUrl} />
        <span className="trainer-row-copy">
          <span className="trainer-row-name">
            <span className="trainer-row-name-text">{trainer.name}</span>
            {isSelf && <small>{m.pvp_you()}</small>}
          </span>
          {detail && <span className="trainer-row-detail">{detail}</span>}
        </span>
      </span>
      <span className="trainer-row-score">
        <strong>{score}</strong>
        <small>{scoreLabel}</small>
      </span>
      {children && <span className="trainer-row-extra">{children}</span>}
      {action && (
        <span className="trainer-row-action" aria-hidden="true">
          {action}
        </span>
      )}
    </>
  )
  return (
    <div
      className="trainer-row"
      data-rank={rank}
      data-self={isSelf}
      data-extra={Boolean(children)}
      data-action={Boolean(action)}
      data-interactive={Boolean(onSelect)}
      data-disabled={disabled}
    >
      {onSelect && (
        <button
          type="button"
          className="trainer-row-select"
          onClick={onSelect}
          disabled={disabled}
          aria-label={actionLabel}
        />
      )}
      {content}
    </div>
  )
}

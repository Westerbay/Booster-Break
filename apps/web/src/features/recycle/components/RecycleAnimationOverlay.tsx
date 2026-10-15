import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { MotionStyle } from 'motion/react'
import { SparklesIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { AwardedCard } from '@tcg-collection/shared'

import { cn } from '@/lib/utils'
import type { RecyclePreviewCard } from '../lib/recycle-utils'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { CardImageDialog } from '@/features/dashboard/components/CardImageDialog'
import { FoilCardImage } from '@/features/dashboard/components/FoilCardImage'
import { NewCardBadge } from '@/features/dashboard/components/NewCardBadge'
import {
  createRevealParticles,
  getParticleClassName,
  isParticleRevealTier,
  resolveCardRevealTier,
  type ParticleRevealTier,
} from '@/features/dashboard/lib/card-reveal'
import { WebGlCardViewer } from '@/features/dashboard/components/WebGlCardViewer'
import { m } from '@/paraglide/messages'

interface RecycleAnimationOverlayProps {
  batches: RecyclePreviewCard[][]
  rewards: AwardedCard[] | null
  setNameById?: Record<string, string>
  onClose: () => void
}

interface CombineStageProps {
  consumed: RecyclePreviewCard[]
  onCombined: () => void
}

interface RewardRevealProps {
  card: AwardedCard
  setName?: string
  isSettled: boolean
  onSettled: () => void
}

type RevealPhase = 'merge' | 'reveal' | 'settled'

interface RevealParticlesProps {
  cardId: string
  tier: ParticleRevealTier
  shouldReduceMotion: boolean
}

interface RecycleRecapProps {
  rewards: AwardedCard[]
  onClose: () => void
}

const GATHER_DURATION_MS = 650
const COMBINE_DURATION_MS = 750
const MERGE_DURATION_MS = GATHER_DURATION_MS + COMBINE_DURATION_MS
const RECYCLE_PARTICLE_COLOR = '134 239 172'

export function RecycleAnimationOverlay({
  batches,
  rewards,
  setNameById,
  onClose,
}: RecycleAnimationOverlayProps) {
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<RevealPhase>('merge')
  const [isRecap, setIsRecap] = useState(false)

  const total = rewards?.length ?? 0
  const isLastReward = total > 0 && index >= total - 1
  const reward = rewards?.[index] ?? null

  const goToNext = useCallback(() => {
    if (isLastReward) {
      setIsRecap(true)
      return
    }

    setIndex((current) => current + 1)
    setPhase('merge')
  }, [isLastReward])

  const settleOrAdvance = useCallback(() => {
    if (phase === 'merge') {
      setPhase('reveal')
      return
    }

    if (!reward) {
      return
    }

    if (phase === 'reveal') {
      setPhase('settled')
      return
    }

    goToNext()
  }, [goToNext, phase, reward])

  const handlePrimary = (event: MouseEvent) => {
    event.stopPropagation()

    if (phase === 'merge') {
      setPhase('reveal')
      return
    }

    if (reward) {
      goToNext()
    }
  }

  const skipAll = (event: MouseEvent) => {
    event.stopPropagation()
    setIsRecap(true)
  }

  if (isRecap && rewards) {
    return <RecycleRecap rewards={rewards} onClose={onClose} />
  }

  const isMerging = phase === 'merge'
  const remaining = total - index - (phase === 'settled' ? 1 : 0)

  return (
    <div
      className="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center overflow-hidden bg-slate-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={m.recycle_title()}
      onClick={settleOrAdvance}
    >
      <div className="relative flex w-[min(44rem,94vw)] flex-col items-center gap-5">
        {isMerging ? (
          <CombineStage
            key={index}
            consumed={batches[index] ?? batches[0] ?? []}
            onCombined={() => setPhase('reveal')}
          />
        ) : reward ? (
          <RewardReveal
            card={reward}
            setName={setNameById?.[reward.setId]}
            isSettled={phase === 'settled'}
            onSettled={() => setPhase('settled')}
          />
        ) : (
          <p className="text-sm font-black text-white/90">{m.recycle_action_pending()}</p>
        )}

        {total > 1 ? (
          <p className="text-sm font-black tabular-nums text-white/80">
            {index + 1} / {total}
          </p>
        ) : null}

        <div className="flex flex-col items-center gap-2">
          {!isMerging && !reward ? null : (
            <Button
              type="button"
              size="lg"
              className="min-w-40 rounded-full bg-white font-black text-slate-950 shadow-[0_16px_45px_-18px_rgb(255_255_255/0.68)] hover:bg-white/90"
              onClick={handlePrimary}
            >
              {isMerging
                ? m.recycle_skip()
                : isLastReward
                  ? m.recycle_reward_close()
                  : m.packs_next()}
            </Button>
          )}

          {rewards && remaining > 1 ? (
            <button
              type="button"
              className="cursor-pointer text-xs font-semibold text-white/45 underline-offset-4 transition hover:text-white/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              onClick={skipAll}
            >
              {m.recycle_skip_all({ count: remaining })}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CombineStage({ consumed, onCombined }: CombineStageProps) {
  const count = consumed.length
  const middle = (count - 1) / 2

  return (
    <>
      <div className="relative flex h-[min(34rem,70vh)] w-full items-center justify-center">
        <span
          className="pointer-events-none absolute"
          style={{ animation: `recycle-phase-driver ${MERGE_DURATION_MS}ms linear forwards` }}
          onAnimationEnd={onCombined}
          aria-hidden="true"
        />

        <span
          className="pointer-events-none absolute left-1/2 top-1/2 size-64 rounded-full bg-[radial-gradient(circle,oklch(0.9_0.18_145/_0.85)_0%,oklch(0.75_0.2_150/_0.35)_45%,transparent_72%)] opacity-0 motion-safe:animate-[recycle-orb-rise_1400ms_ease-in-out_forwards]"
          aria-hidden="true"
        />

        {consumed.map((card, index) => {
          const offset = index - middle
          const fan = `translate(-50%, -50%) translateX(${offset * 112}px) translateY(${Math.abs(offset) * 22}px) rotate(${offset * 9}deg)`

          return (
            <div
              key={`${card.id}-${index}`}
              className="absolute left-1/2 top-1/2 w-60 motion-safe:animate-[recycle-merge_1400ms_ease-in_forwards]"
              style={{ transform: fan, '--recycle-fan': fan } as CSSProperties}
              aria-hidden="true"
            >
              {card.imageSmall ? (
                <FoilCardImage
                  src={card.imageSmall}
                  alt=""
                  cardId={card.id}
                  finish={card.finish}
                  rarity={card.rarity}
                  supertype={card.supertype}
                  isEvolved={card.isEvolved}
                  className="aspect-63/88 w-full rounded-lg object-cover shadow-xl"
                />
              ) : (
                <div className="aspect-63/88 w-full rounded-lg bg-muted" />
              )}
            </div>
          )
        })}
      </div>

      <p className="text-sm font-black text-white/90">{m.recycle_action_pending()}</p>
    </>
  )
}

function RewardReveal({ card, setName, isSettled, onSettled }: RewardRevealProps) {
  const shouldReduceMotion = useReducedMotion() ?? false
  const tier = resolveCardRevealTier(card)
  const imageUrl = card.imageLarge ?? card.imageSmall
  const meta = [formatRarity(card.rarity), setName].filter(Boolean).join(' · ')

  useEffect(() => {
    if (shouldReduceMotion && !isSettled) {
      onSettled()
    }
  }, [isSettled, onSettled, shouldReduceMotion])

  return (
    <div className="relative flex w-full items-center justify-center">
      {isSettled || shouldReduceMotion ? null : (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 size-[44rem] rounded-full bg-[radial-gradient(circle,oklch(1_0_0/_0.9)_0%,oklch(0.9_0.18_145/_0.5)_40%,transparent_70%)] motion-safe:animate-[recycle-burst_700ms_ease-out_forwards]"
          aria-hidden="true"
        />
      )}

      {isParticleRevealTier(tier) ? (
        <RevealParticles cardId={card.id} tier={tier} shouldReduceMotion={shouldReduceMotion} />
      ) : null}

      <article
        className={cn(
          'relative flex w-[min(44rem,94vw,52vh)] flex-col items-center',
          !isSettled &&
            'motion-safe:animate-[recycle-reveal-pop_650ms_cubic-bezier(0.34,1.56,0.64,1)_both]',
        )}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) {
            onSettled()
          }
        }}
      >
        <div className="relative w-full">
          {imageUrl ? (
            <WebGlCardViewer
              key={`${imageUrl}-${card.finish ?? 'normal'}`}
              frontImageUrl={imageUrl}
              alt={card.name}
              cardId={card.id}
              finish={card.finish}
              rarity={card.rarity}
              supertype={card.supertype}
              isEvolved={card.isEvolved}
              className="rounded-2xl drop-shadow-2xl"
            />
          ) : (
            <div className="aspect-63/88 w-full rounded-2xl bg-muted" aria-hidden="true" />
          )}
          {card.isNew ? (
            <NewCardBadge className="bottom-3" shouldReduceMotion={shouldReduceMotion} />
          ) : null}
        </div>
        <p className="mt-3 max-w-full truncate text-lg font-black text-white">{card.name}</p>
        <p className="max-w-full truncate text-sm font-semibold text-white/70">{meta}</p>
      </article>
    </div>
  )
}

function RevealParticles({ cardId, tier, shouldReduceMotion }: RevealParticlesProps) {
  const particles = createRevealParticles(cardId, tier).slice(0, shouldReduceMotion ? 8 : undefined)

  return (
    <div className="pointer-events-none absolute -inset-[22%] z-20" aria-hidden="true">
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className={cn('card-reveal-particle', getParticleClassName(particle.kind))}
          style={
            {
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: particle.size,
              height:
                particle.kind === 'streak' ? Math.max(1, particle.size * 0.08) : particle.size,
              rotate: particle.rotation,
              '--card-reveal-color': RECYCLE_PARTICLE_COLOR,
            } as MotionStyle & { '--card-reveal-color': string }
          }
          initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.2, 1, 0.6],
            x: particle.travelX,
            y: particle.travelY,
          }}
          transition={{
            delay: shouldReduceMotion ? 0 : particle.delay,
            duration: shouldReduceMotion ? 0.2 : particle.duration,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

function RecycleRecap({ rewards, onClose }: RecycleRecapProps) {
  const shouldReduceMotion = useReducedMotion() ?? false
  const [previewCard, setPreviewCard] = useState<AwardedCard>()
  const newCount = rewards.filter((card) => card.isNew).length

  return (
    <>
      <div
        className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/90 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={m.recycle_reward_title({ count: rewards.length })}
      >
        <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col items-center px-3 py-6 sm:px-6">
          <header className="relative z-20 mb-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-2">
              <SparklesIcon className="size-5 text-white/55" aria-hidden="true" />
            </div>
            <h3 className="text-balance text-xl font-black tracking-tight text-white sm:text-2xl">
              {m.recycle_reward_title({ count: rewards.length })}
            </h3>
            <p className="mt-1 text-sm font-semibold text-white/58">
              {newCount > 0
                ? m.packs_new_cards_count({ count: newCount })
                : m.recycle_reward_subtitle()}
            </p>
          </header>

          <div className="relative z-20 grid w-full grid-cols-3 gap-0 sm:grid-cols-5 lg:grid-cols-8">
            {rewards.map((card, index) => (
              <div key={`${card.id}-${index}`} className="relative aspect-63/88 w-full">
                <button
                  type="button"
                  className="absolute inset-0 w-full cursor-pointer rounded-lg bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950/70"
                  aria-label={m.packs_view_card_aria({ name: card.name })}
                  onClick={() => setPreviewCard(card)}
                >
                  {card.isNew ? (
                    <NewCardBadge
                      className="-top-1"
                      compact
                      shouldReduceMotion={shouldReduceMotion}
                    />
                  ) : null}
                  {card.imageSmall ? (
                    <FoilCardImage
                      src={card.imageSmall}
                      alt={card.name}
                      cardId={card.id}
                      finish={card.finish}
                      rarity={card.rarity}
                      supertype={card.supertype}
                      isEvolved={card.isEvolved}
                      className="size-full rounded-lg object-cover drop-shadow-[0_18px_24px_rgb(0_0_0/0.38)]"
                    />
                  ) : (
                    <span className="block size-full rounded-lg bg-slate-800" aria-hidden="true" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            size="lg"
            className="sticky bottom-4 z-30 mt-6 min-w-40 rounded-full bg-white font-black text-slate-950 shadow-[0_16px_45px_-18px_rgb(255_255_255/0.68)] hover:bg-white/90"
            onClick={onClose}
          >
            {m.recycle_reward_close()}
          </Button>
        </div>
      </div>

      {previewCard ? (
        <CardImageDialog card={previewCard} onClose={() => setPreviewCard(undefined)} />
      ) : null}
    </>
  )
}

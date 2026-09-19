import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface PokedexPageTurnProps {
  id: number
  front: ReactNode
  back: ReactNode
  direction: number
  onComplete: (id: number) => void
}
const initial = { rotateY: 0 }
const easing = [0.3, 0.05, 0.25, 1] as const

export function PokedexPageTurn({ id, front, back, direction, onComplete }: PokedexPageTurnProps) {
  const reducedMotion = useReducedMotion()
  const forward = direction > 0
  const animate = { rotateY: forward ? -180 : 180 }
  const transition = { duration: reducedMotion ? 0 : 0.58, ease: easing }
  function complete() {
    onComplete(id)
  }
  return (
    <motion.div
      className="pokedex-turn"
      data-forward={forward}
      aria-hidden="true"
      inert
      initial={initial}
      animate={animate}
      transition={transition}
      onAnimationComplete={complete}
    >
      <div className="pokedex-turn-face">{front}</div>
      <div className="pokedex-turn-face pokedex-turn-back">{back}</div>
    </motion.div>
  )
}

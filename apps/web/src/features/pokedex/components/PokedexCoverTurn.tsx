import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface PokedexCoverTurnProps {
  id: number
  opening: boolean
  edge: 'front' | 'back'
  spread: boolean
  sheet: ReactNode
  children: ReactNode
  onComplete: (id: number) => void
}

const easing = [0.3, 0.05, 0.25, 1] as const
const openingOpacity = [1, 1, 0]
const closingOpacity = [0, 1, 1]

export function PokedexCoverTurn({
  id,
  opening,
  edge,
  spread,
  sheet,
  children,
  onComplete,
}: PokedexCoverTurnProps) {
  const reducedMotion = useReducedMotion()
  const duration = reducedMotion ? 0 : 0.68
  const front = edge === 'front'
  const rotation = front ? -105 : 105
  const centeredLeft = spread ? '25%' : '0%'
  const unfoldedLeft = spread && front ? '50%' : '0%'
  const closedClip = spread ? 'inset(0% 25%)' : 'inset(0% 0%)'
  const openClip = 'inset(0% 0%)'
  const revealInitial = {
    clipPath: opening ? closedClip : openClip,
    opacity: opening ? 0 : 1,
  }
  const revealAnimate = {
    clipPath: opening ? openClip : closedClip,
    opacity: opening ? 1 : 0,
  }
  const sheetInitial = {
    left: opening ? centeredLeft : unfoldedLeft,
    rotateY: opening ? 0 : rotation,
    opacity: opening ? 1 : 0,
  }
  const sheetAnimate = {
    left: opening ? unfoldedLeft : centeredLeft,
    rotateY: opening ? rotation : 0,
    opacity: opening ? openingOpacity : closingOpacity,
  }
  const sheetStyle = { transformOrigin: front ? 'left center' : 'right center' }
  const revealTransition = { duration, ease: easing }
  const sheetTransition = {
    duration,
    ease: easing,
    opacity: { duration, times: [0, 0.5, 1], ease: easing },
  }

  function complete() {
    onComplete(id)
  }

  return (
    <div
      className="pokedex-cover-transition"
      data-opening={opening}
      data-edge={edge}
      data-spread={spread}
    >
      <motion.div
        className="pokedex-cover-reveal"
        initial={revealInitial}
        animate={revealAnimate}
        transition={revealTransition}
      >
        {children}
      </motion.div>
      <motion.div
        className="pokedex-cover-sheet"
        aria-hidden="true"
        inert
        style={sheetStyle}
        initial={sheetInitial}
        animate={sheetAnimate}
        transition={sheetTransition}
        onAnimationComplete={complete}
      >
        {sheet}
      </motion.div>
    </div>
  )
}

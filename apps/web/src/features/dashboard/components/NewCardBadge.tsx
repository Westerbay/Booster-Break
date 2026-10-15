import { motion } from 'motion/react'
import { SparklesIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'

interface NewCardBadgeProps {
  className?: string
  compact?: boolean
  shouldReduceMotion: boolean
}

export function NewCardBadge({
  className,
  compact = false,
  shouldReduceMotion,
}: NewCardBadgeProps) {
  return (
    <motion.span
      className={cn(
        'pointer-events-none absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-amber-400 font-black uppercase tracking-wide text-amber-950 shadow-[0_8px_24px_-7px_rgb(245_158_11/0.75)]',
        compact
          ? 'px-2 py-0.5 text-[0.58rem] sm:px-2.5 sm:text-[0.65rem]'
          : 'px-3 py-1 text-xs sm:px-4 sm:py-1.5 sm:text-sm',
        className,
      )}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={
        shouldReduceMotion
          ? { duration: 0.1 }
          : { delay: 0.16, type: 'spring', stiffness: 410, damping: 20 }
      }
    >
      <SparklesIcon className={compact ? 'size-2.5' : 'size-3.5'} aria-hidden="true" />
      {m.packs_card_new()}
    </motion.span>
  )
}

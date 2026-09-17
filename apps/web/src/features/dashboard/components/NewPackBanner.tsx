import { useState } from 'react'
import { SparklesIcon } from 'lucide-react'
import type { PokemonSetSummary } from '@tcg-collection/shared'

import { isNewPackEventActive, NEW_PACK_EVENT } from '../lib/new-pack-event'
import { Button } from '@/components/ui/button'
import { m } from '@/paraglide/messages'

interface NewPackBannerProps {
  sets: PokemonSetSummary[]
  onSelectSet: (setId: string) => void
}

export function NewPackBanner({ sets, onSelectSet }: NewPackBannerProps) {
  const [isActive] = useState(() => isNewPackEventActive(Date.now()))
  const set = sets.find((candidate) => candidate.id === NEW_PACK_EVENT.setId)

  if (!isActive || !set) {
    return null
  }

  return (
    <aside className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-t-lg border-b bg-accent px-4 py-3 text-accent-foreground md:px-5">
      <SparklesIcon className="size-5 shrink-0" aria-hidden="true" />
      {set.logoUrl ? <img src={set.logoUrl} alt="" className="h-8 w-auto" /> : null}
      <p className="min-w-0 flex-1 text-sm font-semibold">
        <span className="mr-1 text-xs font-black uppercase">{m.new_pack_banner_eyebrow()}</span>{' '}
        {m.new_pack_banner_title({ name: set.name })}
      </p>
      <Button size="sm" onClick={() => onSelectSet(set.id)}>
        {m.new_pack_banner_cta()}
      </Button>
    </aside>
  )
}

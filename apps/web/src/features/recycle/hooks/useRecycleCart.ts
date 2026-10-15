import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { usePokemonCollectionAllQueryOption } from '@/lib/queries/pokemon'

import { useRecycleEngine } from './useRecycleEngine'
import type { RecycleSelection } from '../lib/recycle-utils'

export function useRecycleCart(enabled: boolean) {
  const [selection, setSelection] = useState<RecycleSelection>({})

  const collection = useQuery(
    usePokemonCollectionAllQueryOption({ sort: 'rarity', source: 'owned' }, { enabled }),
  )
  const allCards = useMemo(() => collection.data?.cards ?? [], [collection.data?.cards])

  return useRecycleEngine(allCards, selection, setSelection)
}

import { useQuery } from '@tanstack/react-query'
import { formatRarity } from '@/features/i18n/rarity-labels'
import { usePokemonSetsQueryOption } from '@/lib/queries/pokemon'
import { m } from '@/paraglide/messages'
import { TradeBadge } from './TradeBadge'

interface TradeCardRaritySetProps {
  rarity?: string
  setId?: string
}

export function TradeCardRaritySet({ rarity, setId }: TradeCardRaritySetProps) {
  const setsQuery = useQuery(usePokemonSetsQueryOption())
  const setName = setsQuery.data?.find((set) => set.id === setId)?.name ?? setId

  return (
    <div className="flex max-w-full flex-col items-center gap-1">
      <TradeBadge kind="rarity" value={rarity ?? 'Unknown'} className="text-[0.62rem]">
        {rarity ? formatRarity(rarity) : m.rarity_other()}
      </TradeBadge>
      {setName ? (
        <TradeBadge kind="set" value={setId} className="max-w-full truncate text-[0.62rem]">
          <span className="truncate" title={setName}>
            {setName}
          </span>
        </TradeBadge>
      ) : null}
    </div>
  )
}

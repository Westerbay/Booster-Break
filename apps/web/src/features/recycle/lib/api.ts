import type { RecycleCardsRequest, RecycleCardsResponse } from '@tcg-collection/shared'
import { RECYCLE_COST } from '@tcg-collection/shared'

import { api } from '@/lib/api-client'
import { m } from '@/paraglide/messages'

export async function recycleCards(input: RecycleCardsRequest): Promise<RecycleCardsResponse> {
  const { data, error } = await api.pokemon.cards.recycle.post(input)

  if (error || !data) {
    throw new Error(toRecycleErrorMessage(error?.value))
  }

  return data
}

const toRecycleErrorMessage = (
  payload: { message?: string; error?: string } | undefined,
): string => {
  switch (payload?.error) {
    case 'unauthenticated':
      return m.recycle_sign_in()
    case 'recycle_invalid':
      return m.recycle_error_invalid()
    case 'recycle_nothing':
      return m.recycle_error_nothing({ cost: RECYCLE_COST })
    case 'recycle_conflict':
      return m.recycle_error_conflict()
    default:
      return payload?.message ?? m.recycle_error_generic()
  }
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PvpMatchView } from '@tcg-collection/shared'
import { pvpQueryKeys } from '@/lib/queries/pvp'
import { getLocale } from '@/paraglide/runtime'
import { runPvpCommand } from '../lib/api'

export function usePvpCommand(userId: string, onSuccess?: (match: PvpMatchView) => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: runPvpCommand,
    meta: { suppressToast: true },
    onSuccess: (match) => {
      queryClient.setQueryData(pvpQueryKeys.match(match.id, userId, getLocale()), match)
      void queryClient.invalidateQueries({ queryKey: pvpQueryKeys.all })
      onSuccess?.(match)
    },
  })
}

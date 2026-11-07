import { useEffect, useRef } from 'react'
import { Outlet, useChildMatches } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { GameNav } from '@/features/dashboard/components/GameNav'
import { useLocale } from '@/features/i18n/useLocale'
import { useLogoutMutationOption } from '@/lib/mutations/auth'
import { useCurrentUserQueryOption } from '@/lib/queries/auth'
import { m } from '@/paraglide/messages'
import { cn } from '@/lib/utils'

export function DashboardLayout() {
  useLocale()
  const view = useChildMatches({ select: (matches) => matches[0]?.staticData.dashboardView })
  const main = useRef<HTMLElement>(null)
  const previousView = useRef(view)
  useEffect(() => {
    if (view !== previousView.current) {
      previousView.current = view
      main.current?.focus({ preventScroll: true })
    }
  }, [view])
  const queryClient = useQueryClient()
  const auth = useQuery(useCurrentUserQueryOption())
  const logoutMutation = useMutation(useLogoutMutationOption(queryClient))
  const contentClassName = cn(
    'game-content mx-auto flex min-h-[calc(100dvh-4rem)] w-full items-start justify-center md:min-h-dvh',
    view === 'pokedex' ? 'game-content-pokedex' : 'max-w-7xl px-3 py-5 sm:px-6 lg:px-8',
    (view === 'packs' || view === 'sandbox') && 'game-content-packs',
    view === 'leaders' && 'max-w-5xl',
  )

  return (
    <div className="game-shell min-h-dvh text-foreground" data-view={view}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-sidebar focus:px-4 focus:py-3 focus:text-sidebar-foreground"
      >
        {m.skip_to_main_content()}
      </a>
      <GameNav
        auth={auth.data}
        authIsPending={auth.isPending}
        onLogout={() => logoutMutation.mutate()}
        isLoggingOut={logoutMutation.isPending}
      />
      <main
        ref={main}
        id="main-content"
        tabIndex={-1}
        className="game-main min-h-dvh min-w-0 pt-16 md:pl-52 md:pt-0"
      >
        <div className={contentClassName}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

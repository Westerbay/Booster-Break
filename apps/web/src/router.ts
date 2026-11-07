import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'

import type { DashboardView } from '@/features/dashboard/types'
import { CollectionView } from '@/features/dashboard/views/CollectionView'
import { PacksView } from '@/features/dashboard/views/PacksView'
import { SandboxView } from '@/features/dashboard/views/SandboxView'
import { PokedexView } from '@/features/pokedex/PokedexView'
import { BoardView } from '@/features/pvp/views/BoardView'
import { PvpView } from '@/features/pvp/views/PvpView'
import { TradeView } from '@/features/trade/views/TradeView'
import { DashboardLayout } from '@/pages/DashboardLayout'
import { LeaderboardPage } from '@/pages/LeaderboardPage'
import { RootLayout } from '@/pages/RootLayout'
import { SetupPage } from '@/pages/SetupPage'
import { m } from '@/paraglide/messages'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_dashboard',
  component: DashboardLayout,
})

const packsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  staticData: { dashboardView: 'packs', pageTitle: m.nav_packs },
  validateSearch: (search: Record<string, unknown>): { invitation?: string } => ({
    invitation: typeof search.invitation === 'string' ? search.invitation : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (search.invitation) {
      throw redirect({ to: '/duels', search: { invitation: search.invitation }, replace: true })
    }
  },
  component: PacksView,
})

const sandboxRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/sandbox',
  staticData: { dashboardView: 'sandbox', pageTitle: m.nav_sandbox },
  component: SandboxView,
})

const collectionRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/collection',
  staticData: { dashboardView: 'collection', pageTitle: m.collection_title },
  component: CollectionView,
})

const pokedexRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/pokedex',
  staticData: { dashboardView: 'pokedex', pageTitle: m.nav_pokedex },
  component: PokedexView,
})

const tradeRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/trade',
  staticData: { dashboardView: 'trade', pageTitle: m.trade_view_title },
  component: TradeView,
})

const leaderboardRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/leaderboard',
  staticData: { dashboardView: 'leaders', pageTitle: m.leaderboard_title },
  component: LeaderboardPage,
})

const trainersRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/trainers',
  staticData: { dashboardView: 'boards', pageTitle: m.pvp_board_title },
  component: BoardView,
})

const duelsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/duels',
  staticData: { dashboardView: 'pvp', pageTitle: m.pvp_lobby_title },
  validateSearch: (
    search: Record<string, unknown>,
  ): { invitation?: string; opponent?: string } => ({
    invitation: typeof search.invitation === 'string' ? search.invitation : undefined,
    opponent: typeof search.opponent === 'string' ? search.opponent : undefined,
  }),
  component: PvpView,
})

const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/setup',
  staticData: { pageTitle: m.setup_title },
  component: SetupPage,
})

const routeTree = rootRoute.addChildren([
  dashboardRoute.addChildren([
    packsRoute,
    sandboxRoute,
    collectionRoute,
    pokedexRoute,
    tradeRoute,
    leaderboardRoute,
    trainersRoute,
    duelsRoute,
  ]),
  setupRoute,
])

const basepath =
  import.meta.env.BASE_URL === '/' ? '/' : import.meta.env.BASE_URL.replace(/\/$/, '')

export const router = createRouter({ routeTree, basepath })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }

  interface StaticDataRouteOption {
    dashboardView?: DashboardView
    pageTitle?: () => string
  }
}

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Repeat2Icon,
  LibraryBigIcon,
  BookOpenIcon,
  ContactRoundIcon,
  MenuIcon,
  FlaskConicalIcon,
  SwordsIcon,
  PackageOpenIcon,
  TrophyIcon,
  XIcon,
} from 'lucide-react'
import type { AuthMeResponse } from '@tcg-collection/shared'

import { m } from '@/paraglide/messages'
import { ThemeSelector } from '@/features/theme/ThemeSelector'

import type { DashboardTab, NavItem } from '../types'
import { AuthNavCard } from './AuthNavCard'
import { LanguageSelector } from './LanguageSelector'
import { NavButton } from './NavButton'

interface GameNavProps {
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  auth?: AuthMeResponse
  authIsPending: boolean
  onLogout: () => void
  isLoggingOut: boolean
}

export function GameNav({
  activeTab,
  onTabChange,
  auth,
  authIsPending,
  onLogout,
  isLoggingOut,
}: GameNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  function selectTab(tab: DashboardTab) {
    if (tab === 'leaders') {
      void navigate({ to: '/leaderboard' })
      setIsMobileMenuOpen(false)
      return
    }

    onTabChange(tab)
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <header className="game-nav game-mobile-header fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between bg-sidebar px-4 text-sidebar-foreground md:hidden">
        <div className="game-brand flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg">
            <img src={appIconUrl} alt="" className="size-7 object-contain" />
          </div>
          <div>
            <p className="game-brand-name">{m.app_name()}</p>
            <p className="text-xs font-medium text-sidebar-foreground/72">{m.app_subtitle()}</p>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-game-menu"
          aria-label={isMobileMenuOpen ? m.menu_close() : m.menu_open()}
          className="flex size-10 cursor-pointer items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground transition-colors hover:bg-sidebar-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
        >
          {isMobileMenuOpen ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
        </button>
      </header>

      {isMobileMenuOpen ? (
        <nav
          id="mobile-game-menu"
          aria-label={m.nav_aria()}
          className="game-nav game-mobile-menu fixed inset-x-0 top-16 z-30 grid max-h-[calc(100dvh-4rem)] overflow-y-auto gap-2 bg-sidebar px-4 pb-4 text-sidebar-foreground md:hidden"
        >
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              isActive={activeTab === item.id}
              isDisabled={item.disabled}
              label={getNavLabel(item.id)}
              size="mobile"
              onSelect={() => selectTab(item.id)}
            />
          ))}

          <ThemeSelector className="mt-1" />
          <LanguageSelector className="mt-1" />
          <AuthNavCard
            key={auth?.authenticated ? 'mobile-authenticated' : 'mobile-guest'}
            auth={auth}
            isPending={authIsPending}
            onLogout={onLogout}
            isLoggingOut={isLoggingOut}
            className="mt-1"
          />
        </nav>
      ) : null}

      <nav
        aria-label={m.nav_aria()}
        className="game-nav game-desktop-nav fixed inset-y-0 left-0 z-20 hidden w-52 flex-col overflow-y-auto bg-sidebar px-3 py-3 text-sidebar-foreground md:flex"
      >
        <div className="game-brand flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg">
            <img src={appIconUrl} alt="" className="size-7 object-contain" />
          </div>
          <div>
            <p className="game-brand-name">{m.app_name()}</p>
            <p className="text-xs font-medium text-sidebar-foreground/72">{m.app_subtitle()}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-6">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              icon={item.icon}
              isActive={activeTab === item.id}
              isDisabled={item.disabled}
              label={getNavLabel(item.id)}
              size="desktop"
              onSelect={() => selectTab(item.id)}
            />
          ))}
        </div>

        <ThemeSelector className="mb-2" />
        <LanguageSelector className="mb-2" />
        <AuthNavCard
          key={auth?.authenticated ? 'desktop-authenticated' : 'desktop-guest'}
          auth={auth}
          isPending={authIsPending}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />
      </nav>
    </>
  )
}

const appIconUrl = `${import.meta.env.BASE_URL}cards.png`

const navItems: NavItem[] = [
  { id: 'packs', icon: PackageOpenIcon },
  { id: 'sandbox', icon: FlaskConicalIcon },
  { id: 'collection', icon: LibraryBigIcon },
  { id: 'pokedex', icon: BookOpenIcon },
  { id: 'boards', icon: ContactRoundIcon },
  { id: 'pvp', icon: SwordsIcon },
  { id: 'trade', icon: Repeat2Icon },
  { id: 'leaders', icon: TrophyIcon },
]

const getNavLabel = (tab: DashboardTab): string => {
  switch (tab) {
    case 'packs':
      return m.nav_packs()
    case 'sandbox':
      return m.nav_sandbox()
    case 'collection':
      return m.nav_collection()
    case 'pokedex':
      return m.nav_pokedex()
    case 'boards':
      return m.nav_boards()
    case 'pvp':
      return m.nav_pvp()
    case 'trade':
      return m.nav_trade()
    case 'leaders':
      return m.nav_leaders()
  }
}

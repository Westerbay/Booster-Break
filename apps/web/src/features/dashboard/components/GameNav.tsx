import { useState } from 'react'
import {
  Repeat2Icon,
  LibraryBigIcon,
  BookOpenIcon,
  MenuIcon,
  FlaskConicalIcon,
  PackageOpenIcon,
  TrophyIcon,
  XIcon,
} from 'lucide-react'
import type { AuthMeResponse } from '@tcg-collection/shared'

import { m } from '@/paraglide/messages'
import { ThemeSelector } from '@/features/theme/ThemeSelector'

import { AuthNavCard } from './AuthNavCard'
import { LanguageSelector } from './LanguageSelector'
import { NavLink } from './NavLink'

interface GameNavProps {
  auth?: AuthMeResponse
  authIsPending: boolean
  onLogout: () => void
  isLoggingOut: boolean
}

export function GameNav({ auth, authIsPending, onLogout, isLoggingOut }: GameNavProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const footer = (
    <div className="game-nav-footer">
      <div className="game-nav-preferences">
        <ThemeSelector compact />
        <LanguageSelector />
      </div>
      <AuthNavCard
        key={auth?.authenticated ? 'authenticated' : 'guest'}
        auth={auth}
        isPending={authIsPending}
        onLogout={onLogout}
        isLoggingOut={isLoggingOut}
      />
    </div>
  )

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
            <NavLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label()}
              size="mobile"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          ))}

          {footer}
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
            <NavLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label()}
              size="desktop"
            />
          ))}
        </div>

        {footer}
      </nav>
    </>
  )
}

const appIconUrl = `${import.meta.env.BASE_URL}cards.png`

const navItems = [
  { to: '/', icon: PackageOpenIcon, label: m.nav_packs },
  { to: '/sandbox', icon: FlaskConicalIcon, label: m.nav_sandbox },
  { to: '/collection', icon: LibraryBigIcon, label: m.nav_collection },
  { to: '/pokedex', icon: BookOpenIcon, label: m.nav_pokedex },
  { to: '/trade', icon: Repeat2Icon, label: m.nav_trade },
  { to: '/leaderboard', icon: TrophyIcon, label: m.nav_leaders },
] as const

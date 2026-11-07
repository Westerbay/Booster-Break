import { Link, type LinkProps } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

interface NavLinkProps {
  to: NonNullable<LinkProps['to']>
  icon: LucideIcon
  label: string
  size: 'mobile' | 'desktop'
  onClick?: () => void
}

export function NavLink({ to, icon: Icon, label, size, onClick }: NavLinkProps) {
  return (
    <Link
      to={to}
      search={{}}
      activeOptions={{ exact: true, includeSearch: false }}
      activeProps={{ 'aria-current': 'page' }}
      className={cn(
        'game-nav-link flex w-full items-center text-sidebar-foreground/88 transition-colors hover:bg-sidebar-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        size === 'mobile' ? 'h-11 gap-3 px-3' : 'h-12 shrink-0 gap-3 px-3',
      )}
      onClick={onClick}
    >
      <span className="game-nav-symbol" aria-hidden="true">
        <Icon />
      </span>
      <span className="game-nav-label">{label}</span>
    </Link>
  )
}

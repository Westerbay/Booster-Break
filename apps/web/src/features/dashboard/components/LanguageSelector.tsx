import { useQueryClient } from '@tanstack/react-query'
import type { SupportedLocale } from '@tcg-collection/shared'
import { ChevronDownIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLocale } from '@/features/i18n/useLocale'
import { cn } from '@/lib/utils'
import { m } from '@/paraglide/messages'
import { pokemonQueryKeys } from '../lib/query-keys'
import { tradeQueryKeys } from '@/features/trade/lib/query-keys'

const languages: Array<{ locale: SupportedLocale; flag: string; shortLabel: string }> = [
  { locale: 'fr', flag: '🇫🇷', shortLabel: 'FR' },
  { locale: 'en', flag: '🇬🇧', shortLabel: 'EN' },
]

export function LanguageSelector({
  className,
  contentClassName,
  positionerClassName,
  variant = 'sidebar',
  density = 'normal',
}: {
  className?: string
  contentClassName?: string
  positionerClassName?: string
  density?: 'normal' | 'compact'
  variant?: 'sidebar' | 'surface'
}) {
  const queryClient = useQueryClient()
  const { locale, setLocale } = useLocale()
  const activeLanguage = languages.find((language) => language.locale === locale) ?? languages[0]
  const isSurface = variant === 'surface'
  const isCompact = density === 'compact'

  function updateLocale(nextLocale: SupportedLocale) {
    if (nextLocale === locale) {
      return
    }

    setLocale(nextLocale)
    queryClient.invalidateQueries({ queryKey: pokemonQueryKeys.all })
    queryClient.invalidateQueries({ queryKey: tradeQueryKeys.all })
  }

  return (
    <div
      className={cn(
        isSurface && 'rounded-lg border border-border bg-background p-2',
        isSurface && isCompact && 'p-1.5',
        className,
      )}
    >
      <p
        className={cn(
          'mb-2 text-[0.68rem] font-black uppercase tracking-normal',
          (!isSurface || isCompact) && 'sr-only',
          'text-muted-foreground',
        )}
      >
        {m.language_label()}
      </p>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={m.language_label()}
          className={cn(
            'flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 text-sm font-black transition-colors focus-visible:outline-none focus-visible:ring-2',
            isSurface
              ? 'border-border bg-card text-card-foreground hover:bg-muted focus-visible:ring-ring'
              : 'h-11 gap-1.5 border-transparent px-2 text-xs font-semibold hover:bg-muted aria-expanded:bg-muted focus-visible:ring-sidebar-ring',
            isSurface && isCompact && 'h-9 px-2.5',
          )}
        >
          <span className={cn('flex items-center', isSurface ? 'gap-2' : 'gap-1.5')}>
            <span aria-hidden="true">{activeLanguage.flag}</span>
            <span>{activeLanguage.shortLabel}</span>
          </span>
          <ChevronDownIcon
            className={isSurface ? undefined : 'size-3.5 shrink-0'}
            aria-hidden="true"
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align={isSurface ? 'start' : 'end'}
          side={isSurface ? 'bottom' : 'top'}
          sideOffset={6}
          className={cn('w-32', contentClassName)}
          positionerClassName={positionerClassName}
        >
          <DropdownMenuRadioGroup
            value={locale}
            onValueChange={(nextLocale) => updateLocale(nextLocale as SupportedLocale)}
          >
            {languages.map((language) => {
              const label = language.locale === 'fr' ? m.language_fr() : m.language_en()

              return (
                <DropdownMenuRadioItem
                  key={language.locale}
                  value={language.locale}
                  closeOnClick
                  label={label}
                  className="h-10 cursor-pointer px-2.5 font-bold"
                >
                  <span aria-hidden="true">{language.flag}</span>
                  <span>{language.shortLabel}</span>
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

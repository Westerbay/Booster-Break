import { useEffect } from 'react'
import { Outlet, useMatches } from '@tanstack/react-router'

import { useLocale } from '@/features/i18n/useLocale'
import { RadioPlayer } from '@/features/radio/RadioPlayer'

import { ServerStatusGate } from '@/features/server-status/ServerStatusGate'
import { Toaster } from '@/features/toast/Toaster'
import { TradeNotificationManager } from '@/features/trade/components/TradeNotificationManager'
import { PvpNotificationManager } from '@/features/pvp/components/PvpNotificationManager'
import { m } from '@/paraglide/messages'

export function RootLayout() {
  useLocale()
  const routeTitle = useMatches({ select: (matches) => matches.at(-1)?.staticData.pageTitle })
  const appTitle = m.app_name()
  const title = routeTitle ? `${routeTitle()} · ${appTitle}` : appTitle

  useEffect(() => {
    document.title = title
  }, [title])

  return (
    <>
      <Outlet />
      <RadioPlayer />
      <TradeNotificationManager />
      <PvpNotificationManager />
      <ServerStatusGate />
      <Toaster />
    </>
  )
}

import { Outlet } from '@tanstack/react-router'

import { ServerStatusGate } from '@/features/server-status/ServerStatusGate'
import { Toaster } from '@/features/toast/Toaster'
import { TradeNotificationManager } from '@/features/trade/components/TradeNotificationManager'
import { PvpNotificationManager } from '@/features/pvp/components/PvpNotificationManager'

export function RootLayout() {
  return (
    <>
      <Outlet />
      <TradeNotificationManager />
      <PvpNotificationManager />
      <ServerStatusGate />
      <Toaster />
    </>
  )
}

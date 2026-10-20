import { Outlet } from '@tanstack/react-router'

import { RadioPlayer } from '@/features/radio/RadioPlayer'

import { ServerStatusGate } from '@/features/server-status/ServerStatusGate'
import { Toaster } from '@/features/toast/Toaster'
import { TradeNotificationManager } from '@/features/trade/components/TradeNotificationManager'
import { PvpNotificationManager } from '@/features/pvp/components/PvpNotificationManager'

export function RootLayout() {
  return (
    <>
      <div className="pb-16">
        <Outlet />
      </div>
      <RadioPlayer />
      <TradeNotificationManager />
      <PvpNotificationManager />
      <ServerStatusGate />
      <Toaster />
    </>
  )
}

import type { DashboardTab } from '../types'
import { CollectionView } from './CollectionView'
import { PacksView } from './PacksView'
import { SandboxView } from './SandboxView'
import { TradeView } from '../../trade/views/TradeView'
import { BoardView } from '../../pvp/views/BoardView'
import { PvpView } from '../../pvp/views/PvpView'

interface DashboardContentProps {
  activeTab: DashboardTab
  opponentId?: string
  invitationId?: string
  onEnterArena: (opponentId?: string) => void
  onResetArenaEntry: () => void
  onBoard: () => void
}

export function DashboardContent(props: DashboardContentProps) {
  switch (props.activeTab) {
    case 'packs':
      return <PacksView />
    case 'sandbox':
      return <SandboxView />
    case 'collection':
      return <CollectionView />
    case 'trade':
      return <TradeView />
    case 'boards':
      return <BoardView onEnter={props.onEnterArena} />
    case 'pvp':
      return (
        <PvpView
          opponentId={props.opponentId}
          invitationId={props.invitationId}
          onResetEntry={props.onResetArenaEntry}
          onBoard={props.onBoard}
        />
      )
    default:
      return <PacksView />
  }
}

import { useSyncExternalStore } from 'react'

const spreadQuery = '(min-width: 1100px)'
function subscribe(listener: () => void) {
  const query = window.matchMedia(spreadQuery)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}
function getSnapshot() {
  return window.matchMedia(spreadQuery).matches
}
function getServerSnapshot() {
  return false
}

export function useBookSpread() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

const scope = new URL(self.registration.scope)
const offlinePage = new URL('offline.html', scope).href
const cachePrefix = `booster-break-offline:${scope.pathname}:`
// Bump the version when offline.html changes so existing installs refresh it.
const cacheName = `${cachePrefix}v1`

self.addEventListener('install', (event) => {
  event.waitUntil(installOfflinePage())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(activateOfflineCache())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode !== 'navigate' || request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return
  const relativePath = url.pathname.slice(scope.pathname.length)
  if (/^(api|radio|dev)(\/|$)/.test(relativePath)) return

  // The online app and all account data are always requested from the network.
  event.respondWith(fetch(request).catch(offlineResponse))
})

async function installOfflinePage() {
  const cache = await caches.open(cacheName)
  await cache.add(new Request(offlinePage, { cache: 'reload' }))
  await self.skipWaiting()
}

async function activateOfflineCache() {
  const keys = await caches.keys()
  const outdated = keys.filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
  await Promise.all(outdated.map((key) => caches.delete(key)))
  await self.clients.claim()
}

async function offlineResponse() {
  return (await caches.match(offlinePage, { cacheName })) ?? Response.error()
}

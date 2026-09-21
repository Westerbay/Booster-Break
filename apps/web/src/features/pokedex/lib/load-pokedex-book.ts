import type { PokedexSetResponse } from '@tcg-collection/shared'
import { resolveFoilAssetUrl } from '@/features/dashboard/lib/card-foil'

type LoadImage = (src: string) => Promise<boolean>

/** Prepare the entire selected set before the cover opens, including decoded artwork. */
export async function loadPokedexBook(
  fetchPage: (page: number) => Promise<PokedexSetResponse>,
  loadImage: LoadImage = decodeImage,
) {
  const first = await fetchPage(1)
  const slots = [...first.slots]
  for (let page = 2; page <= first.pagination.pageCount; page++) {
    slots.push(...(await fetchPage(page)).slots)
  }

  const images = new Map<string, Promise<boolean>>()
  function preload(src: string) {
    let image = images.get(src)
    if (!image) {
      image = loadImage(src)
      images.set(src, image)
    }
    return image
  }

  if (slots.some((slot) => slot.discovered)) await preload(resolveFoilAssetUrl('metal'))
  // Bound image downloads even for large sets; no work is started for hidden cards.
  let next = 0
  async function worker() {
    while (next < slots.length) {
      const index = next++
      const slot = slots[index]!
      if (!slot.discovered) continue
      const source = slot.card.imageLarge ?? slot.card.imageSmall
      if (!source) continue
      if (await preload(source)) continue
      const fallback = source.replace('://assets.tcgdex.net/fr/', '://assets.tcgdex.net/en/')
      const available = fallback !== source && (await preload(fallback))
      slots[index] = {
        ...slot,
        card: {
          ...slot.card,
          imageLarge: available ? fallback : undefined,
          imageSmall: available ? fallback : undefined,
        },
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, slots.length) }, worker))
  return { set: first.set, slots }
}

function decodeImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image()
    // Use the same request mode and URL as FoilCardImage to share its browser cache.
    const timeout = setTimeout(() => finish(false), 15_000)
    function finish(ready: boolean) {
      clearTimeout(timeout)
      image.onload = null
      image.onerror = null
      if (!ready) image.src = ''
      resolve(ready)
    }
    image.onload = () => {
      void image.decode().then(
        () => finish(true),
        () => finish(false),
      )
    }
    image.onerror = () => finish(false)
    image.src = src
  })
}

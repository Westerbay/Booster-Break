import type { CollectionSort, SupportedLocale } from '@tcg-collection/shared'

export const tradeQueryKeys = {
  all: ['trade'] as const,
  auctions: (locale: SupportedLocale) => ['trade', 'auctions', locale] as const,
  auction: (auctionId: string, locale: SupportedLocale) =>
    ['trade', 'auction', locale, auctionId] as const,
  notifications: (locale: SupportedLocale) => ['trade', 'notifications', locale] as const,
  notificationsAll: ['trade', 'notifications'] as const,
  recipientOwnershipAll: ['trade', 'recipient-ownership'] as const,
  recipientOwnership: (userId: string, auctionId: string, cardIds: readonly string[]) =>
    ['trade', 'recipient-ownership', userId, auctionId, cardIds] as const,
  requestCreatorCollection: (
    auctionId: string,
    locale: SupportedLocale,
    params: { sort: CollectionSort; minimumQuantity: number; minimumRarity?: string },
  ) => ['trade', 'request-creator-collection', locale, auctionId, params] as const,
  notification: (notificationId: string) => ['trade', 'notification', notificationId] as const,
}

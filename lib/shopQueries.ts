import { prisma } from '@/lib/prisma';
import type { MerchItem, TicketItem } from '@/components/shop/ShopItems';

export async function shopItems(take?: number): Promise<{ tickets: TicketItem[]; merch: MerchItem[] }> {
  const [events, products] = await Promise.all([
    prisma.event.findMany({ where: { ticketPrice: { gt: 0 }, date: { gte: new Date() } }, orderBy: { date: 'asc' }, take }),
    prisma.product.findMany({ where: { active: true }, orderBy: [{ createdAt: 'desc' }], take }),
  ]);
  return {
    tickets: events.map((e) => ({ id: e.id, title: e.title, date: e.date, place: e.place, price: e.ticketPrice, left: e.ticketQuota ?? 0, imageUrl: e.imageUrl })),
    merch: products.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock, variants: p.variants, imageUrl: p.imageUrl })),
  };
}

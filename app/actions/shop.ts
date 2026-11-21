'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { liveUser, mustBeAdmin } from '@/lib/guard';
import { pickedFile, removeImage, saveImage } from '@/lib/upload';
import type { FormState } from './public';

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const money = (v: FormDataEntryValue | null) => Math.max(0, Math.round(Number(String(v ?? '').replace(/[^\d]/g, '')) || 0));
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const phoneOk = (p: string) => /^\+?[\d\s-]{8,20}$/.test(p);
const refreshShop = () => { for (const p of ['/', '/toko', '/anggota/kelola/toko', '/anggota/kelola/pesanan', '/anggota/kelola/acara', '/anggota/kelola']) revalidatePath(p); };

// short, unambiguous, readable over the phone: IK-7KQ4MT
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => 'IK-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ALPHABET[b % ALPHABET.length]).join('');

/* ---------- public: order, proof, lookup ---------- */
export async function createOrder(_: FormState, f: FormData): Promise<FormState> {
  const kind = str(f, 'kind', 10) === 'ticket' ? 'TICKET' : 'MERCH';
  const itemId = str(f, 'item', 40);
  const qty = Math.max(1, Math.min(10, Math.floor(Number(f.get('qty')) || 1)));
  const buyerName = str(f, 'name', 120), buyerEmail = str(f, 'email', 200).toLowerCase(), buyerPhone = str(f, 'phone', 24);
  let variant: string | null = str(f, 'variant', 40) || null;
  if (!buyerName || !emailOk(buyerEmail)) return { error: 'Isi nama dan email yang valid' };
  if (!phoneOk(buyerPhone)) return { error: 'Isi nomor WhatsApp yang valid' };
  const session = await liveUser(); // checked against the database: a stale token never links an order to a missing user

  let orderId = '';
  try {
    orderId = await prisma.$transaction(async (tx) => {
      let name: string, unitPrice: number;
      if (kind === 'TICKET') {
        const ev = await tx.event.findUnique({ where: { id: itemId } });
        if (!ev || ev.ticketPrice <= 0 || ev.date < new Date()) throw new Error('Tiket acara ini tidak dijual');
        // conditional decrement: two buyers can never take the last ticket together
        const took = await tx.event.updateMany({ where: { id: ev.id, ticketQuota: { gte: qty } }, data: { ticketQuota: { decrement: qty } } });
        if (!took.count) throw new Error('Tiket tidak cukup. Kurangi jumlah atau pilih acara lain.');
        name = ev.title; unitPrice = ev.ticketPrice; variant = null;
      } else {
        const pr = await tx.product.findUnique({ where: { id: itemId } });
        if (!pr || !pr.active) throw new Error('Produk ini tidak dijual');
        const options = (pr.variants ?? '').split(',').map((v) => v.trim()).filter(Boolean);
        if (options.length && (!variant || !options.includes(variant))) throw new Error('Pilih ukuran atau varian');
        if (!options.length) variant = null;
        const took = await tx.product.updateMany({ where: { id: pr.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } });
        if (!took.count) throw new Error('Stok tidak cukup. Kurangi jumlah.');
        name = pr.name; unitPrice = pr.price;
      }
      for (let attempt = 0; ; attempt++) {
        try {
          const order = await tx.order.create({
            data: {
              code: newCode(), kind, buyerName, buyerEmail, buyerPhone, userId: session?.id ?? null, total: unitPrice * qty,
              items: { create: { name, variant, unitPrice, qty, ...(kind === 'TICKET' ? { eventId: itemId } : { productId: itemId }) } },
            },
          });
          return order.id;
        } catch (e) {
          if (attempt < 3 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
          throw e;
        }
      }
    });
  } catch (e) {
    if (e instanceof Error && e.name === 'Error') return { error: e.message }; // our own checks above
    console.error('createOrder', e);
    return { error: 'Pesanan gagal dibuat. Coba lagi.' };
  }
  refreshShop();
  redirect(`/pesanan/${orderId}`);
}

export async function uploadProof(_: FormState, f: FormData): Promise<FormState> {
  const order = await prisma.order.findUnique({ where: { id: str(f, 'id', 40) } });
  if (!order) return { error: 'Pesanan tidak ditemukan' };
  if (order.status !== 'PENDING' && order.status !== 'REVIEW') return { error: 'Pesanan ini tidak menunggu pembayaran' };
  const file = pickedFile(f.get('proof'));
  if (!file) return { error: 'Pilih foto bukti transfer' };
  const saved = await saveImage(file, 'bukti');
  if ('error' in saved) return { error: saved.error };
  await prisma.order.update({ where: { id: order.id }, data: { proofUrl: saved.url, status: 'REVIEW' } });
  await removeImage(order.proofUrl);
  refreshShop();
  revalidatePath(`/pesanan/${order.id}`);
  return { ok: true, message: 'Bukti terkirim. Pengurus akan memeriksanya.' };
}

export async function findOrder(_: FormState, f: FormData): Promise<FormState> {
  const code = str(f, 'code', 20).toUpperCase().replace(/^IK-?/, 'IK-');
  const email = str(f, 'email', 200).toLowerCase();
  const order = await prisma.order.findFirst({ where: { code, buyerEmail: email }, select: { id: true } });
  if (!order) return { error: 'Pesanan dengan kode dan email itu tidak ada' };
  redirect(`/pesanan/${order.id}`);
}

/* ---------- admin: products ---------- */
export async function saveProduct(_: FormState, f: FormData): Promise<FormState> {
  await mustBeAdmin();
  const id = str(f, 'id', 40);
  const name = str(f, 'name', 120);
  const price = Math.min(50_000_000, money(f.get('price')));
  const stock = Math.max(0, Math.min(100_000, Math.floor(Number(f.get('stock')) || 0)));
  const variants = str(f, 'variants', 200).split(',').map((v) => v.trim()).filter(Boolean).join(',') || null;
  if (!name || !price) return { error: 'Isi nama dan harga' };
  const old = id ? await prisma.product.findUnique({ where: { id } }) : null;
  if (id && !old) return { error: 'Produk tidak ditemukan' };
  let imageUrl = old?.imageUrl ?? null;
  const file = pickedFile(f.get('image'));
  if (file) {
    const saved = await saveImage(file, 'merch');
    if ('error' in saved) return { error: saved.error };
    await removeImage(imageUrl);
    imageUrl = saved.url;
  } else if (f.get('image__remove') === 'on') {
    await removeImage(imageUrl);
    imageUrl = null;
  }
  const data = { name, price, stock, variants, imageUrl, description: str(f, 'description', 1000) || null, active: f.get('active') === 'on' };
  if (old) await prisma.product.update({ where: { id: old.id }, data });
  else await prisma.product.create({ data });
  refreshShop();
  return { ok: true, message: old ? 'Perubahan disimpan' : 'Produk ditambahkan' };
}

export async function deleteProduct(f: FormData) {
  await mustBeAdmin();
  const pr = await prisma.product.findUnique({ where: { id: str(f, 'id', 40) }, include: { _count: { select: { orderItems: true } } } });
  if (!pr) return;
  // sold products stay for the order history; they are only hidden from the shop
  if (pr._count.orderItems) await prisma.product.update({ where: { id: pr.id }, data: { active: false } });
  else { await prisma.product.delete({ where: { id: pr.id } }); await removeImage(pr.imageUrl); }
  refreshShop();
}

/* ---------- admin: orders ---------- */
// PENDING/REVIEW -> PAID records the income in kas; -> REJECTED/CANCELLED returns the stock or tickets.
export async function setOrderStatus(f: FormData) {
  const admin = await mustBeAdmin();
  const id = str(f, 'id', 40);
  const to = str(f, 'status', 12) as 'PAID' | 'REJECTED' | 'CANCELLED';
  if (!['PAID', 'REJECTED', 'CANCELLED'].includes(to)) return;
  const note = str(f, 'note', 300) || null;
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
    if (!order || (order.status !== 'PENDING' && order.status !== 'REVIEW')) return;
    const moved = await tx.order.updateMany({ where: { id, status: order.status }, data: { status: to, note, paidAt: to === 'PAID' ? new Date() : null } });
    if (!moved.count) return; // someone else already handled it
    if (to === 'PAID') {
      await tx.transaction.create({
        data: {
          type: 'IN', amount: order.total, date: new Date(), recordedById: admin.id,
          description: `${order.kind === 'TICKET' ? 'Tiket' : 'Merch'} ${order.code}: ${order.items.map((i) => `${i.name}${i.variant ? ` (${i.variant})` : ''} ×${i.qty}`).join(', ')}`.slice(0, 200),
        },
      });
    } else {
      for (const it of order.items) {
        if (it.eventId) await tx.event.updateMany({ where: { id: it.eventId, ticketQuota: { not: null } }, data: { ticketQuota: { increment: it.qty } } });
        if (it.productId) await tx.product.updateMany({ where: { id: it.productId }, data: { stock: { increment: it.qty } } });
      }
    }
  });
  refreshShop();
  revalidatePath('/anggota/kelola/kas');
  revalidatePath(`/pesanan/${id}`);
}

export async function toggleCheckIn(f: FormData) {
  await mustBeAdmin();
  const id = str(f, 'id', 40);
  await prisma.order.updateMany({ where: { id, kind: 'TICKET', status: 'PAID' }, data: { checkedIn: f.get('checkedIn') === '1' } });
  refreshShop();
}

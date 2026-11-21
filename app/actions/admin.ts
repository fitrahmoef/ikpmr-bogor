'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { mustBeAdmin } from '@/lib/guard';
import { DIVISIONS } from '@/lib/riau';
import { pickedFile, removeImage, saveImage } from '@/lib/upload';
import type { FormState } from './public';

const str = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? '').trim().slice(0, max);
const refresh = (...paths: string[]) => { for (const p of paths) revalidatePath(p); revalidatePath('/'); };

/* ---------- members ---------- */
export async function setMemberStatus(f: FormData) {
  const admin = await mustBeAdmin();
  const id = str(f, 'id', 40);
  const status = str(f, 'status', 20) as 'ACTIVE' | 'INACTIVE' | 'PENDING';
  if (!['ACTIVE', 'INACTIVE', 'PENDING'].includes(status) || id === admin.id) return;
  await prisma.user.update({ where: { id }, data: { status } });
  refresh('/anggota/kelola/anggota', '/anggota/kelola');
}

export async function setMemberRole(f: FormData) {
  const admin = await mustBeAdmin();
  const id = str(f, 'id', 40);
  const role = str(f, 'role', 20) as 'ADMIN' | 'MEMBER';
  if (!['ADMIN', 'MEMBER'].includes(role) || id === admin.id) return; // no self-demotion lockout
  await prisma.user.update({ where: { id }, data: { role, ...(role === 'ADMIN' ? { status: 'ACTIVE' } : {}) } });
  refresh('/anggota/kelola/anggota');
}

export async function setMemberPosition(f: FormData) {
  await mustBeAdmin();
  const id = str(f, 'id', 40);
  const position = str(f, 'position', 80);
  await prisma.user.update({ where: { id }, data: { position: position || null, featured: f.get('featured') === 'on' } });
  refresh('/anggota/kelola/anggota');
}

/* ---------- events ---------- */
const money = (v: FormDataEntryValue | null) => Math.max(0, Math.round(Number(String(v ?? '').replace(/[^\d]/g, '')) || 0));

// Create when there is no id, update otherwise. A paid event always has a ticket quota (defaults to its capacity).
export async function saveEvent(_: FormState, f: FormData): Promise<FormState> {
  await mustBeAdmin();
  const id = str(f, 'id', 40);
  const title = str(f, 'title', 160), place = str(f, 'place', 160), division = str(f, 'division', 40);
  const date = new Date(`${str(f, 'date', 20)}T${str(f, 'time', 10) || '09:00'}:00+07:00`);
  const capacity = Math.max(1, Math.min(5000, Number(f.get('capacity')) || 100));
  const ticketPrice = Math.min(50_000_000, money(f.get('ticketPrice')));
  const quotaRaw = str(f, 'ticketQuota', 10);
  const ticketQuota = ticketPrice > 0 ? Math.max(0, Math.min(5000, quotaRaw === '' ? capacity : Number(quotaRaw) || 0)) : null;
  if (!title || !place || isNaN(date.getTime())) return { error: 'Lengkapi judul, tanggal, dan tempat' };
  if (!(DIVISIONS as readonly string[]).includes(division)) return { error: 'Pilih bidang' };

  const old = id ? await prisma.event.findUnique({ where: { id } }) : null;
  if (id && !old) return { error: 'Acara tidak ditemukan' };
  let imageUrl = old?.imageUrl ?? null;
  const file = pickedFile(f.get('image'));
  if (file) {
    const saved = await saveImage(file, 'acara');
    if ('error' in saved) return { error: saved.error };
    await removeImage(imageUrl);
    imageUrl = saved.url;
  } else if (f.get('image__remove') === 'on') {
    await removeImage(imageUrl);
    imageUrl = null;
  }
  const data = { title, place, division, date, capacity, description: str(f, 'description') || null, imageUrl, ticketPrice, ticketQuota };
  if (old) await prisma.event.update({ where: { id: old.id }, data });
  else await prisma.event.create({ data });
  refresh('/anggota/kelola/acara', '/anggota', '/anggota/acara', '/toko');
  return { ok: true, message: old ? 'Perubahan disimpan' : 'Acara ditambahkan' };
}

export async function deleteEvent(f: FormData) {
  await mustBeAdmin();
  const ev = await prisma.event.findUnique({ where: { id: str(f, 'id', 40) }, include: { _count: { select: { orderItems: true } } } });
  if (!ev) return;
  if (ev._count.orderItems) return; // sold tickets keep their event; the page explains why
  await prisma.event.delete({ where: { id: ev.id } });
  await removeImage(ev.imageUrl);
  refresh('/anggota/kelola/acara', '/anggota/acara', '/toko');
}

/* ---------- announcements ---------- */
export async function createAnnouncement(_: FormState, f: FormData): Promise<FormState> {
  const admin = await mustBeAdmin();
  const title = str(f, 'title', 200), body = str(f, 'body', 4000);
  const priority = str(f, 'priority', 10) as 'HIGH' | 'MEDIUM' | 'LOW';
  if (!title || !body) return { error: 'Judul dan isi wajib diisi' };
  if (!['HIGH', 'MEDIUM', 'LOW'].includes(priority)) return { error: 'Pilih prioritas' };
  await prisma.announcement.create({ data: { title, body, priority, authorId: admin.id } });
  refresh('/anggota/kelola/pengumuman', '/anggota');
  return { ok: true, message: 'Pengumuman diterbitkan' };
}

export async function deleteAnnouncement(f: FormData) {
  await mustBeAdmin();
  await prisma.announcement.delete({ where: { id: str(f, 'id', 40) } }).catch(() => null);
  refresh('/anggota/kelola/pengumuman', '/anggota');
}

/* ---------- contact messages ---------- */
export async function toggleMessageRead(f: FormData) {
  await mustBeAdmin();
  const id = str(f, 'id', 40);
  await prisma.contactMessage.update({ where: { id }, data: { read: f.get('read') === '1' } });
  refresh('/anggota/kelola/pesan', '/anggota/kelola');
}

export async function deleteMessage(f: FormData) {
  await mustBeAdmin();
  await prisma.contactMessage.delete({ where: { id: str(f, 'id', 40) } }).catch(() => null);
  refresh('/anggota/kelola/pesan');
}

/* ---------- cash ---------- */
export async function createTransaction(_: FormState, f: FormData): Promise<FormState> {
  const admin = await mustBeAdmin();
  const type = str(f, 'type', 4) as 'IN' | 'OUT';
  const amount = Math.round(Number(String(f.get('amount') ?? '').replace(/[^\d]/g, '')));
  const description = str(f, 'description', 200);
  const date = new Date(`${str(f, 'date', 20)}T12:00:00+07:00`);
  if (!['IN', 'OUT'].includes(type) || !amount || !description || isNaN(date.getTime())) return { error: 'Lengkapi jenis, jumlah, keterangan, dan tanggal' };
  await prisma.transaction.create({ data: { type, amount, description, date, recordedById: admin.id } });
  refresh('/anggota/kelola/kas', '/anggota/kelola');
  return { ok: true, message: 'Transaksi dicatat' };
}

export async function deleteTransaction(f: FormData) {
  await mustBeAdmin();
  await prisma.transaction.delete({ where: { id: str(f, 'id', 40) } }).catch(() => null);
  refresh('/anggota/kelola/kas', '/anggota/kelola');
}

/* ---------- gallery ---------- */
export async function uploadPhoto(_: FormState, f: FormData): Promise<FormState> {
  const admin = await mustBeAdmin();
  const file = pickedFile(f.get('file'));
  const caption = str(f, 'caption', 120);
  if (!file) return { error: 'Pilih foto' };
  if (!caption) return { error: 'Isi keterangan foto' };
  const saved = await saveImage(file, 'galeri');
  if ('error' in saved) return { error: saved.error };
  await prisma.galleryPhoto.create({ data: { url: saved.url, caption, uploadedById: admin.id } });
  refresh('/anggota/kelola/galeri');
  return { ok: true, message: 'Foto ditambahkan ke galeri' };
}

export async function updatePhotoCaption(f: FormData) {
  await mustBeAdmin();
  const caption = str(f, 'caption', 120);
  if (!caption) return;
  await prisma.galleryPhoto.update({ where: { id: str(f, 'id', 40) }, data: { caption } }).catch(() => null);
  refresh('/anggota/kelola/galeri');
}

export async function deletePhoto(f: FormData) {
  await mustBeAdmin();
  const photo = await prisma.galleryPhoto.findUnique({ where: { id: str(f, 'id', 40) } });
  if (!photo) return;
  await prisma.galleryPhoto.delete({ where: { id: photo.id } });
  await removeImage(photo.url);
  refresh('/anggota/kelola/galeri');
}

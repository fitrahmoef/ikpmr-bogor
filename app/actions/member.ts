'use server';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { liveUser, mustBeActive } from '@/lib/guard';
import { REGENCIES, DIVISIONS } from '@/lib/riau';
import type { FormState } from './public';

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);

export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const u = await liveUser();
  if (!u) return { error: 'Sesi berakhir, silakan masuk lagi' };
  const name = str(f, 'name', 120);
  const regency = str(f, 'regency', 40);
  const division = str(f, 'division', 40);
  if (!name) return { error: 'Nama wajib diisi' };
  if (regency && !REGENCIES.some((r) => r.key === regency)) return { error: 'Kabupaten tidak dikenal' };
  if (division && !(DIVISIONS as readonly string[]).includes(division)) return { error: 'Divisi tidak dikenal' };
  const data: Record<string, unknown> = {
    name, regency: regency || null, division: division || null,
    university: str(f, 'university', 120) || null, phone: str(f, 'phone', 40) || null, bio: str(f, 'bio', 600) || null,
  };
  const pw = String(f.get('password') ?? '');
  if (pw) {
    if (pw.length < 8) return { error: 'Kata sandi baru minimal 8 karakter' };
    data.passwordHash = await bcrypt.hash(pw, 10);
  }
  await prisma.user.update({ where: { id: u.id }, data });
  revalidatePath('/anggota', 'layout');
  return { ok: true, message: 'Profil tersimpan' };
}

export async function toggleRegistration(f: FormData) {
  const u = await mustBeActive();
  const eventId = str(f, 'eventId', 40);
  const ev = await prisma.event.findUnique({ where: { id: eventId }, include: { _count: { select: { registrations: true } } } });
  if (!ev || ev.date < new Date()) return;
  const existing = await prisma.eventRegistration.findUnique({ where: { userId_eventId: { userId: u.id, eventId } } });
  if (existing) await prisma.eventRegistration.delete({ where: { id: existing.id } });
  else if (ev._count.registrations < ev.capacity) await prisma.eventRegistration.create({ data: { userId: u.id, eventId } });
  revalidatePath('/anggota');
  revalidatePath('/anggota/acara');
}

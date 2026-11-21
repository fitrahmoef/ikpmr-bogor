// Live role/status checks against the database for server actions and API routes.
import { currentUser } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function liveUser() {
  const s = await currentUser();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.id } });
}

export async function mustBeActive() {
  const u = await liveUser();
  if (!u) throw new Error('Belum masuk');
  if (u.status !== 'ACTIVE' && u.role !== 'ADMIN') throw new Error('Akun menunggu persetujuan pengurus');
  return u;
}

export async function mustBeAdmin() {
  const u = await liveUser();
  if (!u || u.role !== 'ADMIN') throw new Error('Khusus admin');
  return u;
}

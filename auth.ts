import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { authConfig } from './auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const email = String(raw?.email ?? '').trim().toLowerCase();
        const password = String(raw?.password ?? '');
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
        if (user.status === 'INACTIVE') return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status };
      },
    }),
  ],
});

export type SessionUser = { id: string; name: string; email: string; role: 'ADMIN' | 'MEMBER'; status: 'PENDING' | 'ACTIVE' | 'INACTIVE' };

export async function currentUser(): Promise<SessionUser | null> {
  const s = await auth();
  return (s?.user as SessionUser | undefined) ?? null;
}

export async function requireUser() {
  const u = await currentUser();
  if (!u) throw new Error('Belum masuk');
  return u;
}

export async function requireActive() {
  const u = await requireUser();
  if (u.status !== 'ACTIVE' && u.role !== 'ADMIN') throw new Error('Akun menunggu persetujuan pengurus');
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== 'ADMIN') throw new Error('Khusus admin');
  return u;
}

'use server';
import bcrypt from 'bcryptjs';
import { AuthError } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { signIn, signOut } from '@/auth';
import { REGENCIES } from '@/lib/riau';

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

const str = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

export async function sendContact(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, 'name', 120), email = str(f, 'email', 200).toLowerCase(), message = str(f, 'message', 4000);
  if (!name || !emailOk(email) || message.length < 5) return { error: 'Lengkapi nama, email yang valid, dan pesan' };
  await prisma.contactMessage.create({ data: { name, email, message } });
  return { ok: true, message: 'Pesan terkirim. Pengurus akan membalas lewat email.' };
}

export async function register(_: FormState, f: FormData): Promise<FormState> {
  const name = str(f, 'name', 120);
  const email = str(f, 'email', 200).toLowerCase();
  const password = String(f.get('password') ?? '');
  const university = str(f, 'university', 120);
  const regency = str(f, 'regency', 40);
  if (!name || !emailOk(email)) return { error: 'Isi nama dan email yang valid' };
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter' };
  if (!REGENCIES.some((r) => r.key === regency)) return { error: 'Pilih kabupaten atau kota asal' };
  if (await prisma.user.findUnique({ where: { email } })) return { error: 'Email ini sudah terdaftar. Silakan masuk.' };
  await prisma.user.create({
    data: { name, email, university: university || null, regency, passwordHash: await bcrypt.hash(password, 10) },
  });
  try {
    await signIn('credentials', { email, password, redirectTo: '/anggota' });
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Akun dibuat, tetapi gagal masuk otomatis. Silakan masuk.' };
    throw e; // redirect
  }
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const next = str(f, 'next', 200);
  const email = str(f, 'email', 200).toLowerCase();
  try {
    await signIn('credentials', {
      email,
      password: String(f.get('password') ?? ''),
      redirectTo: next.startsWith('/') && !next.startsWith('//') ? next : '/anggota',
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: 'Email atau kata sandi salah' };
    throw e;
  }
}

export async function logout() {
  await signOut({ redirectTo: '/' });
}

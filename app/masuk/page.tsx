import { redirect } from 'next/navigation';
import { liveUser } from '@/lib/guard';
import { AuthShell } from '@/components/AuthShell';
import { LoginForm } from '@/components/AuthForms';

export const metadata = { title: 'Masuk' };

export default async function Page({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const u = await liveUser(); // a session whose account was deleted must not bounce back to /anggota
  if (u) redirect('/anggota');
  const { callbackUrl } = await searchParams;
  let next = '';
  try { next = callbackUrl ? new URL(callbackUrl, 'http://x').pathname : ''; } catch {}
  return (
    <AuthShell
      title="Masuk"
      sub="Ruang anggota dan pengurus IKPMR Bogor"
      side={{ title: 'Selamat datang di rumah', body: 'Agenda, pengumuman, obrolan dengan sesama anggota, dan peta sebaran keluarga Riau di Bogor ada di satu tempat.' }}
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}

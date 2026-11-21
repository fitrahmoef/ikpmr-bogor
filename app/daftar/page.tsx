import { redirect } from 'next/navigation';
import { liveUser } from '@/lib/guard';
import { AuthShell } from '@/components/AuthShell';
import { RegisterForm } from '@/components/AuthForms';

export const metadata = { title: 'Bergabung' };

export default async function Page() {
  if (await liveUser()) redirect('/anggota');
  return (
    <AuthShell
      title="Bergabung dengan IKPMR"
      sub="Untuk pelajar dan mahasiswa asal Riau yang menempuh pendidikan di Bogor"
      side={{ title: 'Satu ikatan, satu Riau', body: 'Setelah mendaftar, pengurus memeriksa data kamu. Begitu disetujui, kamu bisa mendaftar acara dan ikut obrolan anggota.' }}
    >
      <RegisterForm />
    </AuthShell>
  );
}

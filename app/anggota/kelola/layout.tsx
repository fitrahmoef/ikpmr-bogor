import { redirect } from 'next/navigation';
import { liveUser } from '@/lib/guard';

// Pengurus pages live inside the member area; this only guards access.
export default async function Layout({ children }: { children: React.ReactNode }) {
  const u = await liveUser();
  if (!u || u.role !== 'ADMIN') redirect('/anggota');
  return <>{children}</>;
}

import { redirect } from 'next/navigation';
import { currentUser } from '@/auth';
import { prisma } from '@/lib/prisma';
import { navFor } from '@/lib/nav';
import { Shell } from '@/components/app/Shell';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await currentUser();
  if (!s) redirect('/masuk');
  // the token may be older than an approval, so read the live status
  const u = await prisma.user.findUnique({ where: { id: s.id }, select: { name: true, role: true, status: true } });
  if (!u) redirect('/masuk');
  return <Shell user={u} sections={await navFor({ ...s, role: u.role, status: u.status })}>{children}</Shell>;
}

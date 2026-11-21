import { prisma } from '@/lib/prisma';
import type { NavSection } from '@/components/app/Shell';
import type { SessionUser } from '@/auth';

export async function navFor(user: SessionUser): Promise<NavSection[]> {
  const member: NavSection = {
    label: 'Anggota',
    links: [
      { href: '/anggota', label: 'Beranda', icon: 'home', exact: true },
      { href: '/anggota/acara', label: 'Acara', icon: 'calendar' },
      { href: '/anggota/obrolan', label: 'Obrolan', icon: 'chat' },
      { href: '/anggota/peta', label: 'Peta anggota', icon: 'map' },
      { href: '/anggota/profil', label: 'Profil', icon: 'user' },
    ],
  };
  if (user.role !== 'ADMIN') return [member];
  const [pending, unread, toVerify] = await Promise.all([
    prisma.user.count({ where: { status: 'PENDING' } }),
    prisma.contactMessage.count({ where: { read: false } }),
    prisma.order.count({ where: { status: 'REVIEW' } }),
  ]);
  return [
    member,
    {
      label: 'Kelola',
      links: [
        { href: '/anggota/kelola', label: 'Ringkasan', icon: 'layout', exact: true },
        { href: '/anggota/kelola/anggota', label: 'Anggota', icon: 'users', count: pending },
        { href: '/anggota/kelola/acara', label: 'Acara', icon: 'calendar' },
        { href: '/anggota/kelola/pengumuman', label: 'Pengumuman', icon: 'megaphone' },
        { href: '/anggota/kelola/pesan', label: 'Pesan masuk', icon: 'inbox', count: unread },
        { href: '/anggota/kelola/kas', label: 'Kas', icon: 'wallet' },
      ],
    },
    {
      label: 'Situs dan toko',
      links: [
        { href: '/anggota/kelola/konten', label: 'Isi situs', icon: 'pen' },
        { href: '/anggota/kelola/galeri', label: 'Galeri', icon: 'image' },
        { href: '/anggota/kelola/toko', label: 'Merch', icon: 'bag' },
        { href: '/anggota/kelola/pesanan', label: 'Pesanan', icon: 'receipt', count: toVerify },
      ],
    },
  ];
}

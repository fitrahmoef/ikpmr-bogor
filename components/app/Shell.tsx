'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Avatar, Logo } from '@/components/brand';
import { ThemeToggle } from '@/components/ThemeToggle';
import * as Icons from '@/components/icons';
import { logout } from '@/app/actions/public';

type IconKey = 'home' | 'calendar' | 'megaphone' | 'chat' | 'map' | 'user' | 'layout' | 'users' | 'inbox' | 'wallet' | 'image' | 'pen' | 'bag' | 'receipt';
const ICON: Record<IconKey, (p: React.SVGProps<SVGSVGElement>) => React.ReactElement> = {
  home: Icons.IconHome, calendar: Icons.IconCalendar, megaphone: Icons.IconMegaphone, chat: Icons.IconChat,
  map: Icons.IconMap, user: Icons.IconUser, layout: Icons.IconLayout, users: Icons.IconUsers,
  inbox: Icons.IconInbox, wallet: Icons.IconWallet, image: Icons.IconImage,
  pen: Icons.IconPen, bag: Icons.IconBag, receipt: Icons.IconReceipt,
};

export type NavLink = { href: string; label: string; icon: IconKey; count?: number; exact?: boolean };
export type NavSection = { label: string; links: NavLink[] };

export function Shell({ user, sections, children }: {
  user: { name: string; role: string; status: string };
  sections: NavSection[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const isActive = (l: NavLink) => (l.exact ? path === l.href : path === l.href || path.startsWith(l.href + '/'));
  const roleLabel = user.role === 'ADMIN' ? 'Pengurus' : user.status === 'PENDING' ? 'Menunggu persetujuan' : 'Anggota';

  return (
    <div className="shell">
      <div className="mobile-bar">
        <Logo />
        <div className="mobile-bar-actions">
          <ThemeToggle className="icon-btn" />
          <button className="icon-btn" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <Icons.IconClose /> : <Icons.IconMenu />}
          </button>
        </div>
      </div>
      {open && <div className="side-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <aside className={`side ${open ? 'open' : ''}`}>
        <Logo />
        <div className="side-scroll">
        {sections.map((s) => (
          <div key={s.label} className="side-section">
            <div className="side-label">{s.label}</div>
            <nav className="side-nav">
              {s.links.map((l) => {
                const Icon = ICON[l.icon];
                return (
                  <Link key={l.href} href={l.href} className={`side-link ${isActive(l) ? 'active' : ''}`} aria-current={isActive(l) ? 'page' : undefined}>
                    <Icon /><span>{l.label}</span>
                    {l.count ? <span className="side-count">{l.count}</span> : <span />}
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
        </div>
        <div className="side-foot">
          <Link href="/" className="side-link"><Icons.IconExternal /><span>Lihat situs</span><span /></Link>
          <div className="side-user">
            <Avatar name={user.name} />
            <div style={{ minWidth: 0 }}>
              <div className="side-user-name">{user.name}</div>
              <div className="side-user-role">{roleLabel}</div>
            </div>
            <ThemeToggle className="icon-btn" />
            <form action={logout}>
              <button className="icon-btn" aria-label="Keluar" title="Keluar"><Icons.IconLogout /></button>
            </form>
          </div>
        </div>
      </aside>
      <div className="main" key={path}>{children}</div>
    </div>
  );
}

// Brand pieces shared by the landing page and the app: logo, rebung mark, songket band, avatar.
import Link from 'next/link';
import { initials } from '@/lib/format';

export const Rebung = () => (
  <svg className="rebung" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <path pathLength={1} d="M1 11.5 5 1l4 10.5z" /><path pathLength={1} d="M3.4 11.5 5 7l1.6 4.5" />
  </svg>
);

export const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <div className="eyebrow"><Rebung />{children}</div>
);

export const Logo = ({ href = '/' }: { href?: string }) => (
  <Link href={href} className="nav-logo">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src="/logo-ikpmr.jpg" alt="" width={32} height={32} />
    <span className="nav-logo-text">IKPMR <span>Bogor</span></span>
  </Link>
);

export const Avatar = ({ name, className = '' }: { name: string; className?: string }) => (
  <div className={`avatar ${className}`} aria-hidden="true">{initials(name)}</div>
);

// Songket band: gold thread pucuk rebung on deep green, woven in SVG.
export function SongketBand({ id = 'sb', className = 'invite-band' }: { id?: string; className?: string }) {
  const gold = 'var(--songket-gold)';
  return (
    <svg className={className} viewBox="0 0 440 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <pattern id={`${id}-weave`} width="4" height="4" patternUnits="userSpaceOnUse">
          <path d="M0 0h4" stroke="#ffffff" strokeOpacity="0.035" />
          <path d="M0 0v4" stroke="#000000" strokeOpacity="0.08" />
        </pattern>
        <pattern id={`${id}-rebung`} x="-4" width="48" height="120" patternUnits="userSpaceOnUse">
          <path d="M2 100 24 26l22 74" stroke={gold} strokeWidth="1.25" fill="none" />
          <path d="M10 100 24 52l14 48" stroke={gold} strokeWidth="1" strokeOpacity="0.7" fill="none" />
          <path d="M24 66v34" stroke={gold} strokeWidth="1" strokeOpacity="0.55" />
          <path d="M24 82l4 6-4 6-4-6z" fill={gold} fillOpacity="0.9" />
          <path d="M40 26l8 0-4 12z" fill={gold} fillOpacity="0.55" />
          <path d="M-8 26l8 0-4 12z" fill={gold} fillOpacity="0.55" />
          <path d="M24 10l4 4-4 4-4-4z" fill="none" stroke={gold} strokeWidth="1" />
          <circle cx="0" cy="14" r="1.2" fill={gold} />
          <circle cx="48" cy="14" r="1.2" fill={gold} />
        </pattern>
      </defs>
      <rect width="440" height="120" fill="var(--songket-green-deep)" />
      <rect width="440" height="120" fill={`url(#${id}-rebung)`} />
      <rect y="4" width="440" height="1" fill={gold} fillOpacity="0.8" />
      <rect y="22" width="440" height="1" fill={gold} fillOpacity="0.5" />
      <rect y="104" width="440" height="1" fill={gold} fillOpacity="0.5" />
      <rect y="108" width="440" height="2" fill={gold} fillOpacity="0.85" />
      <rect y="114" width="440" height="1" fill={gold} fillOpacity="0.4" />
      <rect width="440" height="120" fill={`url(#${id}-weave)`} />
    </svg>
  );
}

// Heading split into masked lines that slide up when their section becomes visible.
export function MaskTitle({ as: Tag = 'h2', className = 'section-title', lines, style }: {
  as?: 'h1' | 'h2'; className?: string; lines: string[]; style?: React.CSSProperties;
}) {
  return (
    <Tag className={className} style={style} aria-label={lines.join(' ')}>
      {lines.map((l, i) => (
        <span className="mask-line" key={i} aria-hidden="true">
          <span style={{ ['--d' as string]: `${80 + i * 90}ms` }}>{l}</span>
        </span>
      ))}
    </Tag>
  );
}

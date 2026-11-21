const tz = 'Asia/Jakarta';

export const rupiah = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);
export const rupiahShort = (n: number) =>
  Math.abs(n) >= 1_000_000 ? `Rp ${(n / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt` : rupiah(n);

export const dateLong = (d: Date | string) =>
  new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz });
export const dateMed = (d: Date | string) =>
  new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz });
export const dayNum = (d: Date | string) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', timeZone: tz });
export const monthShort = (d: Date | string) => new Date(d).toLocaleDateString('id-ID', { month: 'short', timeZone: tz });
export const year = (d: Date | string) => new Date(d).toLocaleDateString('id-ID', { year: 'numeric', timeZone: tz });
export const time = (d: Date | string) =>
  new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: tz });

export const initials = (name: string) =>
  name.replace(/[^A-Za-z\s]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export function relative(d: Date | string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`;
  return dateMed(d);
}

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { dateLong, dayNum, monthShort, time, year } from '@/lib/format';
import { Eyebrow, Logo, MaskTitle } from '@/components/brand';
import { IconArrow, IconChat, IconInsta, IconMail, IconPin } from '@/components/icons';
import { Nav } from '@/components/landing/Nav';
import { Opening } from '@/components/landing/Opening';
import { PinnedHero } from '@/components/landing/PinnedHero';
import { SeamDriver } from '@/components/landing/SeamDriver';
import { SmoothScroll } from '@/components/landing/SmoothScroll';
import { RevealRoot } from '@/components/landing/RevealRoot';
import { AgendaDeck, type DeckEvent } from '@/components/landing/AgendaDeck';
import { ProgramWheel, type Program } from '@/components/landing/ProgramWheel';
import { TeamStage, type Division } from '@/components/landing/TeamStage';
import { ContactForm } from '@/components/landing/ContactForm';
import { Map3D } from '@/components/Map3D';
import { REGENCIES, DIVISIONS } from '@/lib/riau';
import { getContent } from '@/lib/content';
import { shopItems } from '@/lib/shopQueries';
import { MerchCard, TicketCard } from '@/components/shop/ShopItems';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const placeholderGallery = ['Malam Budaya', 'Seminar', 'Gathering', 'Milad IKPMR', 'Workshop', 'Bakti sosial', 'Pertemuan'];
const galleryShape = ['tall', '', '', 'wide', '', '', ''];
const d = (i: number) => ({ ['--d' as string]: `${Math.min(i, 5) * 60}ms` });

async function getData() {
  const now = new Date();
  const [upcoming, past, pengurus, photos, activeCount, byRegency] = await Promise.all([
    prisma.event.findMany({ where: { date: { gte: now } }, orderBy: { date: 'asc' }, take: 8, include: { _count: { select: { registrations: true } } } }),
    prisma.event.findMany({ where: { date: { lt: now } }, orderBy: { date: 'desc' }, take: 6, include: { _count: { select: { registrations: true } } } }),
    prisma.user.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' }, select: { id: true, name: true, position: true, division: true, university: true, featured: true, createdAt: true } }),
    prisma.galleryPhoto.findMany({ orderBy: { createdAt: 'desc' }, take: 7 }),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    // counts only: the public map never shows who is where
    prisma.user.groupBy({ by: ['regency'], where: { status: 'ACTIVE', regency: { not: null } }, _count: true }),
  ]);
  const counts = Object.fromEntries(REGENCIES.map((r) => [r.key, byRegency.find((x) => x.regency === r.key)?._count ?? 0]));
  return { upcoming, past, pengurus, photos, activeCount, counts };
}

export default async function Home() {
  const [{ upcoming, past, pengurus, photos, activeCount, counts }, session, c, shop] = await Promise.all([getData(), auth(), getContent(), shopItems(3)]);
  const account = session?.user ? { href: '/anggota', label: 'Ruang anggota' } : null;

  const toDeck = (e: (typeof upcoming)[number]): DeckEvent => ({
    id: e.id, title: e.title, place: e.place, division: e.division, description: e.description,
    day: dayNum(e.date), month: monthShort(e.date), year: year(e.date), dateLong: dateLong(e.date),
    time: `${time(e.date)} WIB`, registered: e._count.registrations, capacity: e.capacity,
  });

  // team: ketua over the core pengurus, then one card per division with its head and members
  const people = pengurus;
  const isHead = (pos: string | null, div: string) => !!pos && (pos.toLowerCase() === `kepala divisi ${div.toLowerCase()}` || (div === 'Humas' && pos.toLowerCase() === 'humas'));
  const ketuaUser = people.find((u) => u.position?.toLowerCase() === 'ketua umum') ?? null;
  const ketua = ketuaUser ? { id: ketuaUser.id, name: ketuaUser.name, role: ketuaUser.position! } : null;
  const core = people
    .filter((u) => u.featured && u.id !== ketuaUser?.id && u.position)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((u) => ({ id: u.id, name: u.name, role: u.position! }));
  const divisions: Division[] = DIVISIONS.map((div) => {
    const head = people.find((u) => isHead(u.position, div)) ?? null;
    const inDiv = people.filter((u) => u.division === div && !u.featured && u.id !== head?.id);
    return {
      name: div,
      head: head ? { id: head.id, name: head.name, role: head.position! } : null,
      members: inDiv.map((u) => ({ id: u.id, name: u.name, university: u.university })),
      count: inDiv.length + (head ? 1 : 0),
    };
  });
  const programItems: Program[] = DIVISIONS.filter((n) => n !== 'Humas').map((name) => {
    const dv = divisions.find((x) => x.name === name);
    return { name, desc: c(`programs.${name}`), coordinator: dv?.head?.name ?? null, members: dv?.count ?? 0 };
  });

  return (
    <>
      <Opening />
      <RevealRoot />
      <SmoothScroll />
      <SeamDriver />
      <Nav account={account} shop={shop.tickets.length > 0 || shop.merch.length > 0} />
      <main>
        {/* Hero: pinned, scroll-driven */}
        <PinnedHero account={account} eyebrow={c('hero.eyebrow')} title={c('hero.title')} subtitle={c('hero.subtitle')} />

        {/* About */}
        <section id="about" className="section-alt">
          <div className="section-inner about-grid">
            <div data-reveal>
              <Eyebrow>{c('about.eyebrow')}</Eyebrow>
              <MaskTitle lines={[c('about.title')]} />
              <p className="section-desc reveal from-left" style={d(2)}>{c('about.desc')}</p>
              <div className="facts reveal from-left" style={d(3)}>
                <div><div className="fact-number">{c('about.founded')}</div><div className="fact-label">Tahun berdiri</div></div>
                <div><div className="fact-number" data-count={activeCount}>{activeCount}</div><div className="fact-label">Anggota aktif</div></div>
                <div><div className="fact-number" data-count={4}>4</div><div className="fact-label">Bidang kegiatan</div></div>
              </div>
            </div>
            <div data-reveal>
              <div className="history-card reveal from-right" style={d(1)}>
                {c('about.image') && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="history-photo" src={c('about.image')} alt="" loading="lazy" />
                )}
                <div className="history-year">{c('about.historyTitle')}</div>
                <p className="history-text">{c('about.history')}</p>
              </div>
              <div className="vm-grid">
                <div className="vm-card reveal from-right" style={d(2)}>
                  <div className="vm-title">Visi</div>
                  <p className="vm-text">{c('about.vision')}</p>
                </div>
                <div className="vm-card reveal from-right" style={d(3)}>
                  <div className="vm-title">Misi</div>
                  <p className="vm-text">{c('about.mission')}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Programs */}
        <section id="programs">
          <div className="section-inner" data-reveal>
            <div className="section-head-row" style={{ marginBottom: 32 }}>
              <div>
                <Eyebrow>{c('programs.eyebrow')}</Eyebrow>
                <MaskTitle lines={[c('programs.title')]} style={{ marginBottom: 0 }} />
              </div>
              <a href="#events" className="btn btn-secondary reveal from-right" style={d(2)}>Lihat agenda <IconArrow /></a>
            </div>
            <div className="reveal" style={d(1)}>
              <ProgramWheel items={programItems} />
            </div>
          </div>
        </section>

        {/* Events */}
        <section id="events" className="section-alt">
          <div className="section-inner" data-reveal>
            <div className="section-head" style={{ marginBottom: 32 }}>
              <Eyebrow>{c('events.eyebrow')}</Eyebrow>
              <MaskTitle lines={[c('events.title')]} style={{ marginBottom: 0 }} />
            </div>
            <div className="reveal" style={d(1)}>
              <AgendaDeck upcoming={upcoming.map(toDeck)} past={past.map(toDeck)} />
            </div>
          </div>
        </section>

        {/* Shop: tickets and merch */}
        {(shop.tickets.length > 0 || shop.merch.length > 0) && (
          <section id="toko">
            <div className="section-inner" data-reveal>
              <div className="section-head-row" style={{ marginBottom: 32 }}>
                <div>
                  <Eyebrow>{c('shop.eyebrow')}</Eyebrow>
                  <MaskTitle lines={[c('shop.title')]} style={{ marginBottom: 0 }} />
                  <p className="section-desc reveal" style={{ ...d(2), marginTop: 16, marginBottom: 0 }}>{c('shop.desc')}</p>
                </div>
                <Link href="/toko" className="btn btn-secondary reveal from-right" style={d(2)}>Buka toko <IconArrow /></Link>
              </div>
              {shop.tickets.length > 0 && <div className="ticket-grid reveal" style={d(1)}>{shop.tickets.map((t) => <TicketCard key={t.id} t={t} />)}</div>}
              {shop.merch.length > 0 && <div className="merch-grid reveal" style={{ ...d(2), marginTop: shop.tickets.length ? 24 : 0 }}>{shop.merch.map((m) => <MerchCard key={m.id} m={m} />)}</div>}
            </div>
          </section>
        )}

        {/* Members */}
        <section id="members">
          <div className="section-inner" data-reveal>
            <div className="section-head">
              <Eyebrow>{c('members.eyebrow')}</Eyebrow>
              <MaskTitle lines={[c('members.title')]} />
              <p className="section-desc reveal" style={d(2)}>{c('members.desc')}</p>
            </div>
            <div className="reveal" style={d(1)}>
              <TeamStage ketua={ketua} core={core} divisions={divisions} />
            </div>
          </div>
        </section>

        {/* Spread: where members come from, as counts only */}
        <section id="sebaran">
          <div className="section-inner" data-reveal>
            <div className="section-head">
              <Eyebrow>{c('spread.eyebrow')}</Eyebrow>
              <MaskTitle lines={[c('spread.title')]} />
              <p className="section-desc reveal" style={d(2)}>{c('spread.desc')}</p>
            </div>
            <div className="spread-grid">
              <div className="spread-map reveal from-left" style={d(1)}>
                <Map3D counts={counts} />
              </div>
              <div className="spread-side reveal from-right" style={d(2)}>
                <div className="spread-total" data-count={Object.values(counts).reduce((a, b) => a + b, 0)}>{Object.values(counts).reduce((a, b) => a + b, 0)}</div>
                <div className="spread-total-label">{(() => { const n = Object.values(counts).filter(Boolean).length; return n === REGENCIES.length ? `anggota aktif dari semua ${n} kabupaten dan kota` : `anggota aktif dari ${n} dari ${REGENCIES.length} kabupaten dan kota`; })()}</div>
                <ol className="rank-compact">
                  {REGENCIES.map((r) => ({ ...r, n: counts[r.key] })).sort((a, b) => b.n - a.n).map((r, i, arr) => (
                    <li key={r.key} className={i === 0 ? 'lead' : ''}>
                      <span className="rc-name">{r.name.replace('Kota ', '')}</span>
                      <span className="rank-bar"><span style={{ width: `${(r.n / Math.max(1, arr[0].n)) * 100}%`, transitionDelay: `${300 + i * 40}ms` }} /></span>
                      <span className="rc-n">{r.n}</span>
                    </li>
                  ))}
                </ol>
                <p className="spread-note">Batas wilayah: geoBoundaries, BPS. Seret peta untuk melihat dari sisi lain.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section id="gallery" className="section-alt">
          <div className="section-inner" data-reveal>
            <div className="section-head">
              <Eyebrow>{c('gallery.eyebrow')}</Eyebrow>
              <MaskTitle lines={[c('gallery.title')]} style={{ marginBottom: 0 }} />
            </div>
            <div className="gallery-grid">
              {(photos.length ? photos.map((p) => ({ key: p.id, label: p.caption, src: p.url })) : placeholderGallery.map((l) => ({ key: l, label: l, src: '' })))
                .map((g, i) => (
                  <figure className={`gallery-item ${galleryShape[i] ?? ''} reveal ${['from-left', '', 'from-right'][i % 3]}`} key={g.key} style={d(i)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {g.src && <img src={g.src} alt={g.label} loading="lazy" />}
                    <figcaption className="gallery-caption">{g.label}</figcaption>
                  </figure>
                ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact">
          <div className="section-inner contact-grid" data-reveal>
            <div>
              <Eyebrow>{c('contact.eyebrow')}</Eyebrow>
              <MaskTitle lines={[c('contact.title')]} />
              <p className="section-desc reveal from-left" style={d(2)}>{c('contact.desc')}</p>
              <div className="contact-list reveal from-left" style={d(3)}>
                <div className="contact-item"><IconMail /><span className="contact-label">Email</span><a className="contact-value" href={`mailto:${c('contact.email')}`}>{c('contact.email')}</a></div>
                <div className="contact-item"><IconInsta /><span className="contact-label">Instagram</span><a className="contact-value" href={`https://instagram.com/${c('contact.instagram').replace(/^@/, '')}`}>{c('contact.instagram')}</a></div>
                <div className="contact-item"><IconChat /><span className="contact-label">WhatsApp</span><a className="contact-value" href={`https://wa.me/${c('contact.whatsapp').replace(/\D/g, '').replace(/^0/, '62')}`}>{c('contact.whatsapp')}</a></div>
                <div className="contact-item"><IconPin /><span className="contact-label">Sekretariat</span><span className="contact-value">{c('contact.address')}</span></div>
              </div>
            </div>
            <div className="reveal from-right" style={d(2)}>
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="footer-logo"><Logo /></div>
              <p className="footer-tagline">{c('footer.tagline')}</p>
            </div>
            <div className="footer-links">
              <div>
                <div className="footer-col-title">Navigasi</div>
                <ul className="footer-col-links">
                  {[['Tentang', '#about'], ['Program', '#programs'], ['Kegiatan', '#events'], ['Pengurus', '#members']].map(([l, h]) => <li key={l}><a href={h}>{l}</a></li>)}
                </ul>
              </div>
              <div>
                <div className="footer-col-title">Anggota</div>
                <ul className="footer-col-links">
                  {[['Toko', '/toko'], ['Galeri', '#gallery'], ['Kontak', '#contact'], ['Bergabung', '/daftar'], ['Masuk', '/masuk']].map(([l, h]) => <li key={l}><a href={h}>{l}</a></li>)}
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p className="footer-copy">© {new Date().getFullYear()} IKPMR Bogor</p>
            <p className="footer-copy">Dibuat oleh Keluarga Riau Bogor</p>
          </div>
        </div>
      </footer>
    </>
  );
}

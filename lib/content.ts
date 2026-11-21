// Every piece of landing page text and imagery an admin can change, with its default.
// Values live in SiteContent; a missing or empty row falls back to the default here.
import { cache } from 'react';
import { prisma } from '@/lib/prisma';

export type FieldKind = 'text' | 'long' | 'image';
export type Field = { key: string; label: string; kind: FieldKind; def: string; hint?: string };
export type Group = { id: string; title: string; note?: string; fields: Field[] };

const t = (key: string, label: string, def: string, hint?: string): Field => ({ key, label, kind: 'text', def, hint });
const l = (key: string, label: string, def: string, hint?: string): Field => ({ key, label, kind: 'long', def, hint });
const img = (key: string, label: string, hint?: string): Field => ({ key, label, kind: 'image', def: '', hint });

export const GROUPS: Group[] = [
  {
    id: 'hero', title: 'Pembuka', note: 'Layar pertama, di samping rumah adat 3D',
    fields: [
      t('hero.eyebrow', 'Label kecil', 'Satu ikatan, satu Riau, satu tujuan'),
      t('hero.title', 'Judul', 'Rumah bagi pelajar dan mahasiswa Riau di Bogor'),
      l('hero.subtitle', 'Keterangan', 'Ikatan Keluarga Pelajar Mahasiswa Riau mempererat persaudaraan, mendorong prestasi, dan menjaga budaya Melayu lewat kegiatan akademik, sosial, budaya, dan teknologi.'),
    ],
  },
  {
    id: 'about', title: 'Tentang kami',
    fields: [
      t('about.eyebrow', 'Label kecil', 'Tentang kami'),
      t('about.title', 'Judul', 'Mengenal IKPMR Bogor'),
      l('about.desc', 'Paragraf utama', 'IKPMR Bogor adalah organisasi kemahasiswaan yang menghimpun pelajar dan mahasiswa asal Riau yang menempuh pendidikan di Bogor dan sekitarnya. Kami hadir sebagai wadah silaturahmi, pengembangan diri, dan kontribusi nyata bagi daerah dan bangsa.'),
      t('about.founded', 'Tahun berdiri', '2013'),
      t('about.historyTitle', 'Judul kartu sejarah', 'Sejak 2013'),
      l('about.history', 'Sejarah singkat', 'IKPMR Bogor berdiri sebagai respons atas kebutuhan mahasiswa Riau di Bogor akan wadah komunikasi, solidaritas, dan pemberdayaan bersama. Sejak awal, organisasi ini berkomitmen menjaga identitas budaya Riau sekaligus beradaptasi dengan dinamika kota Bogor.'),
      img('about.image', 'Foto kartu sejarah', 'Opsional. Tampil di atas teks sejarah'),
      l('about.vision', 'Visi', 'Menjadi organisasi mahasiswa Riau yang unggul, berdaya saing, dan berakhlak mulia dalam membangun sumber daya manusia yang berkualitas.'),
      l('about.mission', 'Misi', 'Mempererat tali silaturahmi, mendorong prestasi akademik dan non-akademik, serta berkontribusi aktif pada masyarakat dan pembangunan daerah Riau.'),
    ],
  },
  {
    id: 'programs', title: 'Divisi dan program',
    fields: [
      t('programs.eyebrow', 'Label kecil', 'Divisi dan program'),
      t('programs.title', 'Judul', 'Empat bidang kegiatan'),
      l('programs.Akademik', 'Akademik', 'Bimbingan belajar, seminar ilmiah, lomba akademik, dan program beasiswa untuk mendorong prestasi di bidang pendidikan.'),
      l('programs.Sosial', 'Sosial', 'Bakti sosial, kunjungan panti, donor darah, dan program pemberdayaan masyarakat sekitar Bogor.'),
      l('programs.Budaya', 'Budaya', 'Pelestarian seni budaya Riau: tari, musik tradisional, serta perayaan hari besar daerah dan nasional.'),
      l('programs.Teknologi', 'Teknologi', 'Workshop digital, pengembangan aplikasi, literasi teknologi, dan inovasi berbasis kebutuhan mahasiswa.'),
    ],
  },
  {
    id: 'events', title: 'Agenda',
    fields: [t('events.eyebrow', 'Label kecil', 'Kegiatan'), t('events.title', 'Judul', 'Agenda dan acara')],
  },
  {
    id: 'shop', title: 'Tiket dan merch', note: 'Bagian toko di landing page dan halaman /toko',
    fields: [
      t('shop.eyebrow', 'Label kecil', 'Tiket dan merch'),
      t('shop.title', 'Judul', 'Dukung kegiatan kami'),
      l('shop.desc', 'Keterangan', 'Hasil penjualan tiket dan merch masuk ke kas organisasi untuk membiayai kegiatan anggota.'),
    ],
  },
  {
    id: 'members', title: 'Pengurus',
    fields: [
      t('members.eyebrow', 'Label kecil', 'Pengurus'),
      t('members.title', 'Judul', 'Tim kami'),
      l('members.desc', 'Keterangan', 'Digerakkan oleh generasi muda Riau yang berdedikasi, IKPMR Bogor dipimpin oleh pengurus terpilih yang berkomitmen untuk kemajuan bersama.'),
    ],
  },
  {
    id: 'spread', title: 'Sebaran anggota',
    fields: [
      t('spread.eyebrow', 'Label kecil', 'Sebaran anggota'),
      t('spread.title', 'Judul', 'Dari seluruh penjuru Riau'),
      l('spread.desc', 'Keterangan', 'Anggota IKPMR Bogor datang dari kabupaten dan kota di seluruh Provinsi Riau. Tinggi tiap wilayah menunjukkan jumlah anggota aktif yang berasal dari sana.'),
    ],
  },
  {
    id: 'gallery', title: 'Galeri', note: 'Fotonya diatur di menu Galeri',
    fields: [t('gallery.eyebrow', 'Label kecil', 'Galeri'), t('gallery.title', 'Judul', 'Momen bersama')],
  },
  {
    id: 'contact', title: 'Kontak dan footer',
    fields: [
      t('contact.eyebrow', 'Label kecil', 'Hubungi kami'),
      t('contact.title', 'Judul', 'Mari terhubung'),
      l('contact.desc', 'Keterangan', 'Untuk pendaftaran anggota, kerja sama, atau pertanyaan, kirim pesan dan pengurus akan membalas.'),
      t('contact.email', 'Email', 'ikpmrbogor@gmail.com'),
      t('contact.instagram', 'Instagram', '@ikpmr_bogor', 'Dengan @ di depan'),
      t('contact.whatsapp', 'WhatsApp', '+62 812-3456-7890'),
      t('contact.address', 'Sekretariat', 'Bogor, Jawa Barat'),
      l('footer.tagline', 'Kalimat footer', 'Ikatan Keluarga Pelajar Mahasiswa Riau. Mempererat persaudaraan, mendorong prestasi, membangun masa depan.'),
    ],
  },
  {
    id: 'pay', title: 'Pembayaran', note: 'Tampil di halaman pesanan setelah pembeli memesan tiket atau merch',
    fields: [
      t('pay.bank', 'Bank', 'BRI'),
      t('pay.number', 'Nomor rekening', '0000-01-000000-50-0'),
      t('pay.holder', 'Atas nama', 'IKPMR Bogor'),
      img('pay.qris', 'Gambar QRIS', 'Opsional. Pembeli bisa memindai ini sebagai ganti transfer'),
      l('pay.instructions', 'Petunjuk', 'Transfer sesuai total, lalu unggah bukti di halaman ini. Pengurus memeriksa dalam 1×24 jam dan tiket atau pesananmu langsung aktif setelah diverifikasi.'),
    ],
  },
];

export const FIELDS: Record<string, Field> = Object.fromEntries(GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f])));

export type Content = (key: string) => string;

/** One query per request; returns a lookup that falls back to the default. */
export const getContent = cache(async (): Promise<Content> => {
  const rows = await prisma.siteContent.findMany();
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return (key: string) => {
    const v = map.get(key);
    return v && v.trim() ? v : FIELDS[key]?.def ?? '';
  };
});

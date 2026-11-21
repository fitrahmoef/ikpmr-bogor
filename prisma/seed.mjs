// Seed data for local development and the first Vercel deploy.
// Test accounts (change the passwords after the first login on production):
//   pengurus: sekretariat@ikpmr.id   / SEED_ADMIN_PASSWORD  (default: ikpmr-admin-2026)
//   member : nadia@ikpmr.id   / SEED_MEMBER_PASSWORD (default: ikpmr-anggota-2026)
// Every other seeded member uses the member password too.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD || 'ikpmr-admin-2026';
const MEMBER_PW = process.env.SEED_MEMBER_PASSWORD || 'ikpmr-anggota-2026';

const people = [
  ['Ahmad Syahputra', 'ahmad.s', 'Ketua umum', 'Humas', 'IPB University', 'pekanbaru', true, 'ADMIN'],
  ['Fauzi Hasibuan', 'fauzi.h', 'Wakil ketua', 'Humas', 'IPB University', 'kampar', true, 'ADMIN'],
  ['Rina Novianti', 'rina.n', 'Sekretaris', 'Humas', 'Universitas Pakuan', 'siak', true, 'ADMIN'],
  ['Devi Maharani', 'devi.m', 'Bendahara', 'Humas', 'IPB University', 'bengkalis', true, 'ADMIN'],
  ['Budi Prasetyo', 'budi.p', 'Kepala divisi akademik', 'Akademik', 'IPB University', 'dumai', false],
  ['Lisa Wahyuni', 'lisa.w', 'Kepala divisi sosial', 'Sosial', 'Universitas Pakuan', 'inhil', false],
  ['M. Ridwan', 'ridwan', 'Kepala divisi budaya', 'Budaya', 'IPB University', 'kuansing', false],
  ['Sari Permata', 'sari.p', 'Kepala divisi teknologi', 'Teknologi', 'IPB University', 'pekanbaru', false],
  ['Yusuf Ananda', 'yusuf', 'Humas', 'Humas', 'Universitas Djuanda', 'rokan-hilir', false],
  ['Nadia Kartika', 'nadia', null, 'Akademik', 'IPB University', 'pelalawan', false],
  ['Reza Pahlevi', 'reza', null, 'Teknologi', 'IPB University', 'rokan-hulu', false, 'MEMBER', 'PENDING'],
  ['Putri Anggraini', 'putri', null, 'Budaya', 'Universitas Pakuan', 'meranti', false],
  ['Hafiz Ramadhan', 'hafiz', null, 'Sosial', 'IPB University', 'pekanbaru', false],
  ['Aulia Rahmi', 'aulia', null, 'Akademik', 'IPB University', 'kampar', false],
  ['Fikri Alamsyah', 'fikri', null, 'Teknologi', 'Universitas Pakuan', 'pekanbaru', false],
  ['Salsabila Zahra', 'salsa', null, 'Budaya', 'IPB University', 'inhu', false],
  ['Rizky Maulana', 'rizky', null, 'Sosial', 'Universitas Djuanda', 'dumai', false],
  ['Dinda Lestari', 'dinda', null, 'Akademik', 'IPB University', 'bengkalis', false],
  ['Arif Hidayat', 'arif', null, 'Humas', 'Universitas Ibn Khaldun', 'kampar', false],
  ['Nurul Fadhilah', 'nurul', null, 'Budaya', 'IPB University', 'siak', false],
  ['Taufik Hidayatullah', 'taufik', null, 'Akademik', 'IPB University', 'pekanbaru', false],
  ['Mega Safitri', 'mega', null, 'Sosial', 'Universitas Pakuan', 'inhil', false],
  ['Ilham Saputra', 'ilham', null, 'Teknologi', 'IPB University', 'rokan-hilir', false],
  ['Wulan Sari', 'wulan', null, 'Budaya', 'IPB University', 'pelalawan', false],
  ['Bayu Pratama', 'bayu', null, 'Akademik', 'Universitas Djuanda', 'kuansing', false],
  ['Annisa Putri', 'annisa', null, 'Sosial', 'IPB University', 'pekanbaru', false],
  ['Fadli Rahman', 'fadli', null, 'Humas', 'IPB University', 'kampar', false],
  ['Citra Ayu', 'citra', null, 'Akademik', 'Universitas Pakuan', 'rokan-hulu', false],
  ['Gilang Ramadhan', 'gilang', null, 'Teknologi', 'IPB University', 'siak', false],
  ['Indah Permatasari', 'indah', null, 'Budaya', 'IPB University', 'dumai', false, 'MEMBER', 'PENDING'],
];

const d = (s) => new Date(s + 'T09:00:00+07:00');

async function main() {
  // the seed wipes every table first; refuse on a database that already has people in it
  const existing = await prisma.user.count();
  if (existing > 0 && process.env.SEED_FORCE !== '1') {
    console.log(`Database sudah berisi ${existing} pengguna. Seed dibatalkan. Jalankan dengan SEED_FORCE=1 untuk menimpa.`);
    return;
  }
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.siteContent.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.eventRegistration.deleteMany();
  await prisma.event.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.galleryPhoto.deleteMany();
  await prisma.contactMessage.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash(ADMIN_PW, 10);
  const memberHash = await bcrypt.hash(MEMBER_PW, 10);

  const admin = await prisma.user.create({
    data: { name: 'Sekretariat IKPMR', email: 'sekretariat@ikpmr.id', passwordHash: adminHash, role: 'ADMIN', status: 'ACTIVE', division: 'Humas', regency: 'pekanbaru', university: 'IPB University' },
  });

  const users = {};
  let i = 0;
  for (const [name, slug, position, division, university, regency, featured, role = 'MEMBER', status = 'ACTIVE'] of people) {
    const u = await prisma.user.create({
      data: {
        name, email: `${slug}@ikpmr.id`, passwordHash: role === 'ADMIN' ? adminHash : memberHash,
        role, status, position, division, university, regency, featured,
        createdAt: new Date(Date.UTC(2022 + (i % 4), (i * 3) % 12, 1 + (i % 27))),
      },
    });
    users[slug] = u;
    i++;
  }

  const events = await Promise.all([
    ['Malam Budaya Riau', '2026-12-06', 'Gedung Kemuning Gading, Bogor', 'Budaya', 200, 'Tari zapin, musik gambus, dan makan bersama hidangan Melayu. Terbuka untuk anggota, keluarga, dan warga Riau di Bogor.'],
    ['Milad IKPMR ke-13', '2026-12-13', 'Aula Balai Kota Bogor', 'Humas', 250, 'Syukuran ulang tahun organisasi, pemutaran dokumenter kegiatan setahun, dan pelantikan pengurus baru.'],
    ['Bakti Sosial Bogor Selatan', '2027-01-17', 'Kelurahan Mulyaharja, Bogor Selatan', 'Sosial', 50, 'Pembagian sembako dan pemeriksaan kesehatan gratis bersama klinik mitra.'],
    ['Workshop AI dan Machine Learning', '2027-02-07', 'Daring lewat Zoom', 'Teknologi', 80, 'Pengantar machine learning untuk mahasiswa non-informatika, dengan studi kasus data pertanian Riau.'],
    ['Seminar Pemuda Riau', '2026-09-20', 'IPB University, Bogor', 'Akademik', 100, 'Diskusi peran mahasiswa rantau dalam pembangunan Riau.'],
    ['Gebyar Seni dan Budaya Riau', '2026-07-12', 'Taman Kencana, Bogor', 'Budaya', 200, 'Pentas seni terbuka di taman kota.'],
    ['IKPMR Leadership Summit 2026', '2026-05-16', 'Hotel Salak, Bogor', 'Akademik', 120, 'Pelatihan kepemimpinan untuk calon pengurus.'],
  ].map(([title, date, place, division, capacity, description]) =>
    prisma.event.create({ data: { title, date: d(date), place, division, capacity, description } })));

  const slugs = Object.keys(users);
  for (const [ei, ev] of events.entries()) {
    const n = [24, 31, 12, 18, 40, 52, 37][ei];
    for (let k = 0; k < Math.min(n, slugs.length); k++) {
      const u = users[slugs[(k * 7 + ei) % slugs.length]];
      if (u.status !== 'ACTIVE') continue;
      await prisma.eventRegistration.upsert({
        where: { userId_eventId: { userId: u.id, eventId: ev.id } },
        create: { userId: u.id, eventId: ev.id }, update: {},
      });
    }
  }

  await prisma.announcement.createMany({
    data: [
      { title: 'Pendaftaran anggota baru periode 2026/2027 dibuka', body: 'Mahasiswa baru asal Riau yang kuliah di Bogor bisa mendaftar lewat halaman Bergabung sampai 31 Desember 2026. Pengurus akan menghubungi lewat email setelah pendaftaran diperiksa.', priority: 'HIGH', authorId: users['rina.n'].id, createdAt: new Date('2026-11-12T10:00:00+07:00') },
      { title: 'Rapat pleno bulanan, Sabtu 22 November', body: 'Rapat pleno di sekretariat pukul 19.30. Agenda: evaluasi persiapan Malam Budaya Riau dan laporan kas triwulan.', priority: 'MEDIUM', authorId: users['rina.n'].id, createdAt: new Date('2026-11-15T08:00:00+07:00') },
      { title: 'Hasil lomba karya tulis ilmiah IKPMR 2026', body: 'Juara pertama: Aulia Rahmi dengan tulisan tentang restorasi gambut di Pelalawan. Selamat untuk semua peserta.', priority: 'MEDIUM', authorId: users['budi.p'].id, createdAt: new Date('2026-10-28T09:00:00+07:00') },
      { title: 'SOP penggunaan sekretariat diperbarui', body: 'Kunci sekretariat dipinjam lewat humas, maksimal pukul 22.00. Detail lengkap di grup.', priority: 'LOW', authorId: users['ahmad.s'].id, createdAt: new Date('2026-10-20T09:00:00+07:00') },
    ],
  });

  await prisma.contactMessage.createMany({
    data: [
      { name: 'Indra Kurniawan', email: 'indra.k@gmail.com', message: 'Saya mahasiswa baru IPB asal Pekanbaru, ingin bergabung dengan IKPMR. Bagaimana caranya?', createdAt: new Date('2026-11-18T08:10:00+07:00') },
      { name: 'Dr. Maman Suherman', email: 'maman.s@ipb.ac.id', message: 'Kami dari Fakultas Pertanian IPB ingin mengajak kerja sama seminar nasional tentang pertanian lahan gambut.', createdAt: new Date('2026-11-17T14:00:00+07:00') },
      { name: 'Dewi Sartika', email: 'dewi.s@gmail.com', message: 'Saya tertarik menjadi relawan untuk acara Malam Budaya Riau.', read: true, createdAt: new Date('2026-11-15T19:30:00+07:00') },
      { name: 'PT Riau Andalas', email: 'cs@riauandalas.co.id', message: 'Kami tertarik mensponsori kegiatan IKPMR tahun depan. Mohon proposalnya.', read: true, createdAt: new Date('2026-11-12T11:00:00+07:00') },
    ],
  });

  const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'];
  const flows = [[4500000, 2800000], [5200000, 4100000], [3800000, 2200000], [6100000, 5400000], [4900000, 3100000], [5800000, 4700000]];
  const txs = [];
  months.forEach((m, mi) => {
    const [inn, out] = flows[mi];
    txs.push({ type: 'IN', amount: Math.round(inn * 0.55), description: 'Iuran anggota', date: d(`${m}-05`) });
    txs.push({ type: 'IN', amount: inn - Math.round(inn * 0.55), description: mi % 2 ? 'Sponsor kegiatan' : 'Donasi alumni', date: d(`${m}-18`) });
    txs.push({ type: 'OUT', amount: Math.round(out * 0.6), description: 'Konsumsi dan perlengkapan acara', date: d(`${m}-12`) });
    txs.push({ type: 'OUT', amount: out - Math.round(out * 0.6), description: 'Sewa sekretariat dan listrik', date: d(`${m}-25`) });
  });
  await prisma.transaction.createMany({ data: txs.map((t) => ({ ...t, recordedById: users['devi.m'].id })) });

  const chat = [
    ['rina.n', null, 'Assalamualaikum semua. Pengingat rapat pleno Sabtu ini pukul 19.30 di sekretariat.', '2026-11-17T20:00'],
    ['hafiz', null, 'Siap kak. Konsumsi rapat sudah ada yang pegang?', '2026-11-17T20:04'],
    ['devi.m', null, 'Sudah, dari kas divisi sosial. Nanti saya catat.', '2026-11-17T20:06'],
    ['putri', null, 'Untuk Malam Budaya, latihan zapin mulai Kamis depan ya. Yang mau ikut menari kabari saya.', '2026-11-18T07:30'],
    ['nadia', 'aulia', 'Aulia, catatan kuliah statistika minggu lalu masih ada?', '2026-11-18T09:12'],
    ['aulia', 'nadia', 'Ada, nanti sore saya kirim fotonya.', '2026-11-18T09:20'],
  ];
  for (const [from, to, body, at] of chat) {
    await prisma.chatMessage.create({
      data: { body, senderId: users[from].id, recipientId: to ? users[to].id : null, createdAt: new Date(at + ':00+07:00') },
    });
  }

  // shop: two paid events and a few pieces of merch (contoh, tanpa foto)
  await prisma.event.update({ where: { id: events[0].id }, data: { ticketPrice: 35000, ticketQuota: 160 } });
  await prisma.event.update({ where: { id: events[1].id }, data: { ticketPrice: 25000, ticketQuota: 18 } });
  await prisma.product.createMany({
    data: [
      { name: 'Kaos Selembayung', description: 'Kaos katun 24s hitam dengan sablon selembayung emas di dada.', price: 95000, stock: 40, variants: 'S,M,L,XL' },
      { name: 'Tote bag Pucuk Rebung', description: 'Kanvas tebal dengan motif pucuk rebung, muat laptop 14 inci.', price: 65000, stock: 25 },
      { name: 'Pin enamel IKPMR', description: 'Pin logo IKPMR Bogor, 25 mm.', price: 20000, stock: 100 },
    ],
  });

  console.log(`Seed selesai: ${people.length + 1} pengguna, ${events.length} acara, 3 merch. Pengurus: ${admin.email}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

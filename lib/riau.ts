// Kabupaten dan kota di Provinsi Riau, dengan koordinat kira-kira pusat pemerintahannya.
export type Regency = { key: string; name: string; seat: string; lat: number; lng: number };

export const REGENCIES: Regency[] = [
  { key: 'pekanbaru', name: 'Kota Pekanbaru', seat: 'Pekanbaru', lat: 0.5071, lng: 101.4478 },
  { key: 'dumai', name: 'Kota Dumai', seat: 'Dumai', lat: 1.665, lng: 101.447 },
  { key: 'kampar', name: 'Kampar', seat: 'Bangkinang', lat: 0.334, lng: 101.025 },
  { key: 'rokan-hulu', name: 'Rokan Hulu', seat: 'Pasir Pengaraian', lat: 0.892, lng: 100.33 },
  { key: 'rokan-hilir', name: 'Rokan Hilir', seat: 'Bagansiapiapi', lat: 2.159, lng: 100.812 },
  { key: 'bengkalis', name: 'Bengkalis', seat: 'Bengkalis', lat: 1.468, lng: 102.108 },
  { key: 'meranti', name: 'Kepulauan Meranti', seat: 'Selatpanjang', lat: 1.005, lng: 102.72 },
  { key: 'siak', name: 'Siak', seat: 'Siak Sri Indrapura', lat: 0.788, lng: 102.048 },
  { key: 'pelalawan', name: 'Pelalawan', seat: 'Pangkalan Kerinci', lat: 0.409, lng: 101.84 },
  { key: 'inhu', name: 'Indragiri Hulu', seat: 'Rengat', lat: -0.377, lng: 102.545 },
  { key: 'inhil', name: 'Indragiri Hilir', seat: 'Tembilahan', lat: -0.315, lng: 103.159 },
  { key: 'kuansing', name: 'Kuantan Singingi', seat: 'Teluk Kuantan', lat: -0.53, lng: 101.56 },
];

export const regencyName = (key?: string | null) => REGENCIES.find((r) => r.key === key)?.name ?? '—';

export const DIVISIONS = ['Akademik', 'Sosial', 'Budaya', 'Teknologi', 'Humas'] as const;

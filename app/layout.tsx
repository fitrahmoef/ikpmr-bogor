import type { Metadata, Viewport } from 'next';
import { Instrument_Sans, JetBrains_Mono, Newsreader } from 'next/font/google';
import { themeInitScript } from '@/components/ThemeToggle';
import { openingInitScript } from '@/components/landing/Opening';
import './landing.css';
import './motion.css';
import './app.css';
import './sections.css';
import './hero.css';
import './shop.css';

const instrument = Instrument_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-instrument', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jbmono', display: 'swap' });
const newsreader = Newsreader({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-newsreader', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'IKPMR Bogor — Ikatan Keluarga Pelajar Mahasiswa Riau', template: '%s · IKPMR Bogor' },
  description: 'Rumah bagi pelajar dan mahasiswa Riau di Bogor. Agenda, program, pengurus, dan ruang anggota IKPMR Bogor.',
  icons: { icon: '/logo-ikpmr.jpg' },
};

export const viewport: Viewport = {
  // the site draws its own light and dark themes; this tells Android browsers (Chrome's auto dark,
  // Samsung Internet's dark mode) not to repaint the page on top of them
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#161513' },
    { media: '(prefers-color-scheme: light)', color: '#f7f4ee' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" data-theme="dark" className={`${instrument.variable} ${newsreader.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + ';' + openingInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

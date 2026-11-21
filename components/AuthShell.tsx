import { Logo, SongketBand } from './brand';
import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';
import { IconClose } from './icons';

export function AuthShell({ title, sub, side, children }: { title: string; sub: string; side: { title: string; body: string }; children: React.ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-side">
        <SongketBand id="auth" />
        <div className="auth-side-copy">
          <h2>{side.title}</h2>
          <p>{side.body}</p>
        </div>
        <div className="auth-side-foot">Ikatan Keluarga Pelajar Mahasiswa Riau · Bogor</div>
      </aside>
      <main className="auth-main">
        <div className="auth-card main" style={{ padding: 0 }}>
          <div className="auth-top">
            <Logo />
            <div className="auth-top-actions">
              <ThemeToggle className="icon-btn" />
              <Link href="/" className="icon-btn" aria-label="Tutup dan kembali ke beranda" title="Kembali ke beranda"><IconClose /></Link>
            </div>
          </div>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-sub">{sub}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

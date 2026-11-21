import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { liveUser } from '@/lib/guard';
import { regencyName } from '@/lib/riau';
import { dateMed } from '@/lib/format';
import { Avatar } from '@/components/brand';
import { setMemberPosition, setMemberRole, setMemberStatus } from '@/app/actions/admin';

export const metadata = { title: 'Anggota' };

const FILTERS = [['semua', 'Semua'], ['pending', 'Menunggu'], ['aktif', 'Aktif'], ['nonaktif', 'Nonaktif']] as const;
const STATUS = { ACTIVE: ['ok', 'Aktif'], PENDING: ['wait', 'Menunggu'], INACTIVE: ['off', 'Nonaktif'] } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const me = (await liveUser())!;
  const { f = 'semua', q = '' } = await searchParams;
  const status = f === 'pending' ? 'PENDING' : f === 'aktif' ? 'ACTIVE' : f === 'nonaktif' ? 'INACTIVE' : undefined;
  const users = await prisma.user.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { university: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });
  const href = (k: string) => `/anggota/kelola/anggota?f=${k}${q ? `&q=${encodeURIComponent(q)}` : ''}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Anggota</h1>
          <p className="page-sub">Setujui pendaftar, atur jabatan dan akses kelola</p>
        </div>
      </div>
      <div className="toolbar">
        <nav className="segmented" aria-label="Saring status">
          {FILTERS.map(([k, l]) => <Link key={k} href={href(k)} className={f === k ? 'active' : ''}>{l}</Link>)}
        </nav>
        <form>
          <input type="hidden" name="f" value={f} />
          <input name="q" className="form-input" placeholder="Cari nama, email, kampus" defaultValue={q} aria-label="Cari anggota" />
        </form>
        <span className="cell-sub" style={{ marginLeft: 'auto' }}>{users.length} orang</span>
      </div>
      <div className="panel table-wrap">
        <table className="table stack">
          <thead>
            <tr><th>Nama</th><th>Asal</th><th>Kampus</th><th>Jabatan</th><th>Status</th><th>Bergabung</th><th className="num">Tindakan</th></tr>
          </thead>
          <tbody>
            {users.length === 0 && <tr><td colSpan={7}><div className="empty">Tidak ada yang cocok</div></td></tr>}
            {users.map((u) => {
              const [cls, label] = STATUS[u.status];
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="cell-person">
                      <Avatar name={u.name} />
                      <div><div>{u.name}{u.role === 'ADMIN' && <span className="cell-sub"> · bisa mengelola</span>}</div><div className="cell-sub">{u.email}</div></div>
                    </div>
                  </td>
                  <td className="muted" data-label="Asal">{regencyName(u.regency)}</td>
                  <td className="muted" data-label="Kampus">{u.university ?? '—'}</td>
                  <td data-label="Jabatan">
                    <details>
                      <summary style={{ cursor: 'pointer', color: u.position ? 'var(--text)' : 'var(--text-3)', listStyle: 'none' }}>{u.position ?? 'Atur'}{u.featured && <span className="cell-sub"> · inti</span>}</summary>
                      <form action={setMemberPosition} style={{ display: 'grid', gap: 8, marginTop: 8, minWidth: 220 }}>
                        <input type="hidden" name="id" value={u.id} />
                        <input name="position" className="form-input" style={{ height: 36, fontSize: 14 }} defaultValue={u.position ?? ''} placeholder="Kepala divisi budaya" aria-label="Jabatan" />
                        <label className="cell-sub" style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" name="featured" defaultChecked={u.featured} /> Tampil sebagai pengurus inti</label>
                        <button className="btn btn-secondary btn-xs">Simpan</button>
                      </form>
                    </details>
                  </td>
                  <td data-label="Status"><span className={`status ${cls}`}>{label}</span></td>
                  <td className="muted" data-label="Bergabung" style={{ whiteSpace: 'nowrap' }}>{dateMed(u.createdAt)}</td>
                  <td className="cell-actions">
                    {!self && (
                      <div className="row-actions">
                        {u.status !== 'ACTIVE' && (
                          <form action={setMemberStatus}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value="ACTIVE" /><button className="btn btn-primary btn-xs">{u.status === 'PENDING' ? 'Setujui' : 'Aktifkan'}</button></form>
                        )}
                        {u.status !== 'INACTIVE' && (
                          <form action={setMemberStatus}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="status" value="INACTIVE" /><button className="btn btn-ghost btn-xs">{u.status === 'PENDING' ? 'Tolak' : 'Nonaktifkan'}</button></form>
                        )}
                        <form action={setMemberRole}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="role" value={u.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'} /><button className="btn btn-ghost btn-xs">{u.role === 'ADMIN' ? 'Cabut akses kelola' : 'Beri akses kelola'}</button></form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

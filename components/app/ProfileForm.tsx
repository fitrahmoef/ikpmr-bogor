'use client';
import { useActionState } from 'react';
import { updateProfile } from '@/app/actions/member';
import type { FormState } from '@/app/actions/public';
import { REGENCIES, DIVISIONS } from '@/lib/riau';

type P = { name: string; regency: string; division: string; university: string; phone: string; bio: string };

export function ProfileForm({ user }: { user: P }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, undefined);
  return (
    <form action={action}>
      <div className="form-group">
        <label className="form-label" htmlFor="name">Nama lengkap</label>
        <input id="name" name="name" className="form-input" defaultValue={user.name} required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="regency">Asal di Riau</label>
          <select id="regency" name="regency" className="form-input" defaultValue={user.regency}>
            <option value="">Belum diisi</option>
            {REGENCIES.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="division">Divisi</label>
          <select id="division" name="division" className="form-input" defaultValue={user.division}>
            <option value="">Belum memilih</option>
            {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="university">Kampus</label>
          <input id="university" name="university" className="form-input" defaultValue={user.university} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="phone">Nomor WhatsApp</label>
          <input id="phone" name="phone" className="form-input" defaultValue={user.phone} inputMode="tel" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="bio">Tentang kamu</label>
        <textarea id="bio" name="bio" className="form-input" defaultValue={user.bio} placeholder="Jurusan, angkatan, minat" />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="password">Kata sandi baru</label>
        <input id="password" name="password" type="password" className="form-input" autoComplete="new-password" placeholder="Kosongkan jika tidak diganti" minLength={8} />
      </div>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan' : 'Simpan profil'}</button>
        {state?.ok && <span className="status ok" role="status">{state.message}</span>}
      </div>
    </form>
  );
}

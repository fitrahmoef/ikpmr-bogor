'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { login, register, type FormState } from '@/app/actions/public';
import { REGENCIES } from '@/lib/riau';

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="next" value={next ?? ''} />
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="form-input" autoComplete="email" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="password">Kata sandi</label>
        <input id="password" name="password" type="password" className="form-input" autoComplete="current-password" required />
      </div>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <button className="btn btn-primary form-submit" disabled={pending}>{pending ? 'Memeriksa' : 'Masuk'}</button>
      <p className="auth-alt">Belum punya akun? <Link href="/daftar">Daftar sebagai anggota</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(register, undefined);
  return (
    <form action={action}>
      <div className="form-group">
        <label className="form-label" htmlFor="name">Nama lengkap</label>
        <input id="name" name="name" className="form-input" autoComplete="name" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="form-input" autoComplete="email" required />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="regency">Asal di Riau</label>
          <select id="regency" name="regency" className="form-input" required defaultValue="">
            <option value="" disabled>Pilih kabupaten/kota</option>
            {REGENCIES.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="university">Kampus</label>
          <input id="university" name="university" className="form-input" placeholder="IPB University" />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="password">Kata sandi</label>
        <input id="password" name="password" type="password" className="form-input" autoComplete="new-password" minLength={8} required />
      </div>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <button className="btn btn-primary form-submit" disabled={pending}>{pending ? 'Mendaftarkan' : 'Daftar'}</button>
      <p className="auth-alt">Sudah terdaftar? <Link href="/masuk">Masuk</Link></p>
    </form>
  );
}

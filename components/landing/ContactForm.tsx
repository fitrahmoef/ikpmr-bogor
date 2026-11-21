'use client';
import { useActionState, useEffect, useRef } from 'react';
import { sendContact, type FormState } from '@/app/actions/public';
import { IconCheck } from '@/components/icons';

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendContact, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="contact-form">
      <div className="form-group">
        <label className="form-label" htmlFor="f-name">Nama lengkap</label>
        <input id="f-name" name="name" className="form-input" placeholder="Nama kamu" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="f-email">Email</label>
        <input id="f-email" name="email" type="email" className="form-input" placeholder="nama@email.com" required />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="f-msg">Pesan</label>
        <textarea id="f-msg" name="message" className="form-input" placeholder="Pertanyaan atau pesan" required />
      </div>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      {state?.ok
        ? <div className="form-sent" role="status"><IconCheck /> {state.message}</div>
        : <button type="submit" className="btn btn-primary form-submit" disabled={pending}>{pending ? 'Mengirim' : 'Kirim pesan'}</button>}
    </form>
  );
}

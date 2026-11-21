'use client';
import { startTransition, useActionState, useState } from 'react';
import type { FormState } from '@/app/actions/public';
import { createOrder, findOrder, uploadProof } from '@/app/actions/shop';
import { IconCheck } from '@/components/icons';

const rp = (n: number) => 'Rp ' + new Intl.NumberFormat('id-ID').format(n);

export function CheckoutForm({ kind, item, price, max, variants, buyer }: {
  kind: 'ticket' | 'merch'; item: string; price: number; max: number; variants: string[];
  buyer: { name: string; email: string; phone: string };
}) {
  const [state, run, pending] = useActionState<FormState, FormData>(createOrder, undefined);
  const [qty, setQty] = useState(1);
  const limit = Math.max(1, Math.min(10, max));
  return (
    // submit by hand so React does not reset the fields when the server answers with an error
    <form className="checkout-form" onSubmit={(e) => { e.preventDefault(); const data = new FormData(e.currentTarget); startTransition(() => run(data)); }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="item" value={item} />
      {variants.length > 0 && (
        <fieldset className="form-group variant-pick">
          <legend className="form-label">Ukuran</legend>
          <div className="variant-row">
            {variants.map((v, i) => (
              <label key={v} className="variant-chip"><input type="radio" name="variant" value={v} defaultChecked={i === 0} /><span>{v}</span></label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="form-group">
        <span className="form-label" id="qty-label">Jumlah</span>
        <div className="stepper" role="group" aria-labelledby="qty-label">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Kurangi">−</button>
          <output aria-live="polite">{qty}</output>
          <button type="button" onClick={() => setQty((q) => Math.min(limit, q + 1))} disabled={qty >= limit} aria-label="Tambah">+</button>
        </div>
        <input type="hidden" name="qty" value={qty} />
      </div>
      <div className="form-group"><label className="form-label" htmlFor="b-name">Nama lengkap</label><input id="b-name" name="name" className="form-input" defaultValue={buyer.name} autoComplete="name" required /></div>
      <div className="form-row">
        <div className="form-group"><label className="form-label" htmlFor="b-email">Email</label><input id="b-email" name="email" type="email" className="form-input" defaultValue={buyer.email} autoComplete="email" required /></div>
        <div className="form-group"><label className="form-label" htmlFor="b-phone">WhatsApp</label><input id="b-phone" name="phone" type="tel" className="form-input" defaultValue={buyer.phone} autoComplete="tel" placeholder="0812 3456 7890" required /></div>
      </div>
      <div className="checkout-total"><span>Total</span><span>{rp(price * qty)}</span></div>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <button className="btn btn-primary checkout-submit" disabled={pending}>{pending ? 'Memesan' : 'Pesan dan bayar'}</button>
      <p className="cell-sub">Pembayaran lewat transfer atau QRIS. Petunjuknya muncul setelah memesan.</p>
    </form>
  );
}

export function ProofForm({ id, hasProof }: { id: string; hasProof: boolean }) {
  const [state, run, pending] = useActionState<FormState, FormData>(uploadProof, undefined);
  if (state?.ok) return <div className="form-sent" role="status"><IconCheck /> {state.message}</div>;
  return (
    <form action={run} className="proof-form">
      <input type="hidden" name="id" value={id} />
      <label className="form-label" htmlFor="proof">{hasProof ? 'Ganti bukti transfer' : 'Unggah bukti transfer'}</label>
      <input id="proof" name="proof" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="form-input file-input" required />
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <button className="btn btn-primary" disabled={pending}>{pending ? 'Mengunggah' : 'Kirim bukti'}</button>
    </form>
  );
}

export function LookupForm() {
  const [state, run, pending] = useActionState<FormState, FormData>(findOrder, undefined);
  return (
    <form action={run} className="contact-form">
      <div className="form-group"><label className="form-label" htmlFor="l-code">Kode pesanan</label><input id="l-code" name="code" className="form-input mono-input" placeholder="IK-7KQ4MT" required /></div>
      <div className="form-group"><label className="form-label" htmlFor="l-email">Email saat memesan</label><input id="l-email" name="email" type="email" className="form-input" required /></div>
      {state?.error && <div className="form-error" role="alert">{state.error}</div>}
      <button className="btn btn-primary" disabled={pending}>{pending ? 'Mencari' : 'Buka pesanan'}</button>
    </form>
  );
}

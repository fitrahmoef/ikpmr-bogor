'use client';
import { useActionState, useEffect, useRef } from 'react';
import type { FormState } from '@/app/actions/public';
import { createAnnouncement, saveEvent, createTransaction, uploadPhoto } from '@/app/actions/admin';
import { saveProduct } from '@/app/actions/shop';
import { saveContentGroup } from '@/app/actions/cms';
import type { Group } from '@/lib/content';
import { DIVISIONS } from '@/lib/riau';
import { IconPlus } from '@/components/icons';

function useForm(action: (s: FormState, f: FormData) => Promise<FormState>, keep = false) {
  const [state, run, pending] = useActionState<FormState, FormData>(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && !keep) ref.current?.reset(); }, [state, keep]);
  const feedback = state?.error
    ? <div className="form-error" role="alert">{state.error}</div>
    : state?.ok ? <div className="form-note" role="status"><span className="status ok">{state.message}</span></div> : null;
  return { run, pending, ref, feedback };
}

function Editor({ label, children, open = false, icon = true }: { label: string; children: React.ReactNode; open?: boolean; icon?: boolean }) {
  return (
    <details className="editor" open={open}>
      <summary>{icon && <IconPlus />}{label}</summary>
      <div className="editor-body">{children}</div>
    </details>
  );
}

/** Current image, a file picker and a remove switch. The server keeps the old image when nothing is picked. */
export function ImageField({ name, label, url, hint }: { name: string; label: string; url?: string | null; hint?: string }) {
  const id = `img-${name.replace(/\W/g, '-')}`;
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <div className="image-field">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" className="image-thumb" /> : <div className="image-thumb empty-thumb">Belum ada</div>}
        <div className="image-field-side">
          <input id={id} name={name} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="form-input file-input" />
          {url && <label className="check"><input type="checkbox" name={`${name}__remove`} /> Hapus foto</label>}
          {hint && <div className="cell-sub">{hint}</div>}
        </div>
      </div>
    </div>
  );
}

const ymd = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
const hm = (d: Date) => d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });

export type EventDraft = {
  id: string; title: string; date: Date; place: string; division: string; capacity: number;
  description: string | null; imageUrl: string | null; ticketPrice: number; ticketQuota: number | null;
};

/** New event when `event` is missing, edit form otherwise. */
export function EventForm({ event }: { event?: EventDraft }) {
  const { run, pending, ref, feedback } = useForm(saveEvent, !!event);
  const k = event?.id ?? 'new';
  return (
    <Editor label={event ? 'Ubah' : 'Tambah acara'} icon={!event}>
      <form ref={ref} action={run}>
        {event && <input type="hidden" name="id" value={event.id} />}
        <div className="form-group"><label className="form-label" htmlFor={`ev-title-${k}`}>Judul</label><input id={`ev-title-${k}`} name="title" className="form-input" defaultValue={event?.title} required /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label" htmlFor={`ev-date-${k}`}>Tanggal</label><input id={`ev-date-${k}`} name="date" type="date" className="form-input" defaultValue={event ? ymd(event.date) : undefined} required /></div>
          <div className="form-group"><label className="form-label" htmlFor={`ev-time-${k}`}>Jam</label><input id={`ev-time-${k}`} name="time" type="time" className="form-input" defaultValue={event ? hm(event.date) : '09:00'} /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label" htmlFor={`ev-place-${k}`}>Tempat</label><input id={`ev-place-${k}`} name="place" className="form-input" defaultValue={event?.place} required /></div>
          <div className="form-group"><label className="form-label" htmlFor={`ev-div-${k}`}>Bidang</label>
            <select id={`ev-div-${k}`} name="division" className="form-input" defaultValue={event?.division ?? 'Budaya'}>{DIVISIONS.map((d) => <option key={d}>{d}</option>)}</select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label" htmlFor={`ev-cap-${k}`}>Kapasitas</label><input id={`ev-cap-${k}`} name="capacity" type="number" min={1} className="form-input" defaultValue={event?.capacity ?? 100} /></div>
          <div className="form-group"><label className="form-label" htmlFor={`ev-price-${k}`}>Harga tiket (Rp)</label><input id={`ev-price-${k}`} name="ticketPrice" inputMode="numeric" className="form-input" defaultValue={event?.ticketPrice || ''} placeholder="Kosong = gratis" /></div>
        </div>
        <div className="form-group"><label className="form-label" htmlFor={`ev-quota-${k}`}>Sisa tiket untuk dijual</label><input id={`ev-quota-${k}`} name="ticketQuota" type="number" min={0} className="form-input" defaultValue={event?.ticketQuota ?? ''} placeholder="Kosong = sama dengan kapasitas" /></div>
        <ImageField name="image" label="Poster" url={event?.imageUrl} hint="Tampil di toko tiket" />
        <div className="form-group"><label className="form-label" htmlFor={`ev-desc-${k}`}>Keterangan</label><textarea id={`ev-desc-${k}`} name="description" className="form-input" defaultValue={event?.description ?? ''} /></div>
        {feedback}
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan' : event ? 'Simpan perubahan' : 'Simpan acara'}</button>
      </form>
    </Editor>
  );
}

export type ProductDraft = { id: string; name: string; description: string | null; price: number; stock: number; variants: string | null; imageUrl: string | null; active: boolean };

export function ProductForm({ product }: { product?: ProductDraft }) {
  const { run, pending, ref, feedback } = useForm(saveProduct, !!product);
  const k = product?.id ?? 'new';
  return (
    <Editor label={product ? 'Ubah' : 'Tambah produk'} icon={!product}>
      <form ref={ref} action={run}>
        {product && <input type="hidden" name="id" value={product.id} />}
        <div className="form-group"><label className="form-label" htmlFor={`pr-name-${k}`}>Nama</label><input id={`pr-name-${k}`} name="name" className="form-input" defaultValue={product?.name} placeholder="Kaos Selembayung" required /></div>
        <div className="form-row">
          <div className="form-group"><label className="form-label" htmlFor={`pr-price-${k}`}>Harga (Rp)</label><input id={`pr-price-${k}`} name="price" inputMode="numeric" className="form-input" defaultValue={product?.price} placeholder="95000" required /></div>
          <div className="form-group"><label className="form-label" htmlFor={`pr-stock-${k}`}>Stok</label><input id={`pr-stock-${k}`} name="stock" type="number" min={0} className="form-input" defaultValue={product?.stock ?? 0} /></div>
        </div>
        <div className="form-group"><label className="form-label" htmlFor={`pr-var-${k}`}>Ukuran atau varian</label><input id={`pr-var-${k}`} name="variants" className="form-input" defaultValue={product?.variants ?? ''} placeholder="S, M, L, XL" /></div>
        <ImageField name="image" label="Foto produk" url={product?.imageUrl} />
        <div className="form-group"><label className="form-label" htmlFor={`pr-desc-${k}`}>Keterangan</label><textarea id={`pr-desc-${k}`} name="description" className="form-input" defaultValue={product?.description ?? ''} /></div>
        <label className="check" style={{ marginBottom: 16 }}><input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Tampil di toko</label>
        {feedback}
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan' : product ? 'Simpan perubahan' : 'Simpan produk'}</button>
      </form>
    </Editor>
  );
}

export function ContentGroupForm({ group, values }: { group: Group; values: Record<string, string> }) {
  const { run, pending, ref, feedback } = useForm(saveContentGroup, true);
  return (
    <form ref={ref} action={run}>
      <input type="hidden" name="group" value={group.id} />
      {group.fields.map((fl) => {
        const id = `c-${fl.key.replace(/\W/g, '-')}`;
        if (fl.kind === 'image') return <ImageField key={fl.key} name={fl.key} label={fl.label} url={values[fl.key] || null} hint={fl.hint} />;
        return (
          <div className="form-group" key={fl.key}>
            <label className="form-label" htmlFor={id}>{fl.label}</label>
            {fl.kind === 'long'
              ? <textarea id={id} name={fl.key} className="form-input" defaultValue={values[fl.key] ?? fl.def} rows={4} />
              : <input id={id} name={fl.key} className="form-input" defaultValue={values[fl.key] ?? fl.def} />}
            {fl.hint && <div className="cell-sub" style={{ marginTop: 4 }}>{fl.hint}</div>}
          </div>
        );
      })}
      {feedback}
      <button className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan' : 'Simpan'}</button>
    </form>
  );
}

export function AnnouncementForm() {
  const { run, pending, ref, feedback } = useForm(createAnnouncement);
  return (
    <Editor label="Tulis pengumuman">
      <form ref={ref} action={run}>
        <div className="form-group"><label className="form-label" htmlFor="an-title">Judul</label><input id="an-title" name="title" className="form-input" required /></div>
        <div className="form-group"><label className="form-label" htmlFor="an-body">Isi</label><textarea id="an-body" name="body" className="form-input" required /></div>
        <div className="form-group"><label className="form-label" htmlFor="an-pri">Prioritas</label>
          <select id="an-pri" name="priority" className="form-input" defaultValue="MEDIUM">
            <option value="HIGH">Penting</option><option value="MEDIUM">Info</option><option value="LOW">Catatan</option>
          </select>
        </div>
        {feedback}
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Menerbitkan' : 'Terbitkan'}</button>
      </form>
    </Editor>
  );
}

export function TransactionForm() {
  const { run, pending, ref, feedback } = useForm(createTransaction);
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  return (
    <Editor label="Catat transaksi">
      <form ref={ref} action={run}>
        <div className="form-row">
          <div className="form-group"><label className="form-label" htmlFor="tx-type">Jenis</label>
            <select id="tx-type" name="type" className="form-input" defaultValue="IN"><option value="IN">Pemasukan</option><option value="OUT">Pengeluaran</option></select>
          </div>
          <div className="form-group"><label className="form-label" htmlFor="tx-amount">Jumlah (Rp)</label><input id="tx-amount" name="amount" inputMode="numeric" className="form-input" placeholder="250000" required /></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label" htmlFor="tx-desc">Keterangan</label><input id="tx-desc" name="description" className="form-input" placeholder="Iuran anggota" required /></div>
          <div className="form-group"><label className="form-label" htmlFor="tx-date">Tanggal</label><input id="tx-date" name="date" type="date" className="form-input" defaultValue={today} required /></div>
        </div>
        {feedback}
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Menyimpan' : 'Simpan'}</button>
      </form>
    </Editor>
  );
}

export function PhotoForm({ storage }: { storage: 'blob' | 'local' | 'none' }) {
  const { run, pending, ref, feedback } = useForm(uploadPhoto);
  return (
    <Editor label="Unggah foto" open>
      {storage === 'none' && <div className="form-note">Unggahan di Vercel butuh Vercel Blob. Hubungkan Blob di dasbor Vercel agar BLOB_READ_WRITE_TOKEN terisi.</div>}
      {storage === 'local' && <div className="form-note">Mode lokal: foto disimpan di public/uploads. Di Vercel, foto disimpan di Vercel Blob.</div>}
      <form ref={ref} action={run}>
        <div className="form-row">
          <div className="form-group"><label className="form-label" htmlFor="ph-file">Foto</label><input id="ph-file" name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="form-input" style={{ paddingTop: 10 }} required /></div>
          <div className="form-group"><label className="form-label" htmlFor="ph-cap">Keterangan</label><input id="ph-cap" name="caption" className="form-input" placeholder="Malam Budaya 2026" required /></div>
        </div>
        {feedback}
        <button className="btn btn-primary" disabled={pending || storage === 'none'}>{pending ? 'Mengunggah' : 'Unggah'}</button>
      </form>
    </Editor>
  );
}

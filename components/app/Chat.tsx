'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/brand';
import { IconArrow, IconClose, IconDownload, IconFile, IconPaperclip, IconSend, IconUsers } from '@/components/icons';
import { time } from '@/lib/format';

type Attachment = { url: string; name: string; type: string; size: number };
type Msg = { id: string; body: string; at: string; from: { id: string; name: string }; file: Attachment | null };

// mirrors lib/upload.ts: images, PDF, Office files, text, csv and zip, up to 4 MB
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';
const MAX_BYTES = 4 * 1024 * 1024;
const fileSize = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const extOf = (name: string) => (name.includes('.') ? name.split('.').pop()!.toUpperCase().slice(0, 4) : 'FILE');
const isImage = (f: Attachment) => /^image\/(jpeg|png|webp|avif|gif)$/.test(f.type);
type Thread = { id: string; name: string; sub: string; at: string | null };

const POLL_MS = 3000;
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Jakarta' });

export function Chat({ me, threads, initial }: { me: { id: string; name: string }; threads: Thread[]; initial: string }) {
  const [thread, setThread] = useState(initial);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [listOpen, setListOpen] = useState(false); // phones: the thread list replaces the conversation
  const listRef = useRef<HTMLDivElement>(null);
  const lastAt = useRef<string | null>(null);

  const stick = useRef(true); // follow new messages only while the reader is at the bottom
  const scrollDown = () => requestAnimationFrame(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });
  // an image grows the list after it loads, so keep the bottom in view if we were there
  const onMediaLoad = () => { if (stick.current) scrollDown(); };

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const add = incoming.filter((m) => !seen.has(m.id));
      if (!add.length) return prev;
      const next = [...prev, ...add].sort((a, b) => a.at.localeCompare(b.at));
      lastAt.current = next[next.length - 1].at;
      return next;
    });
    scrollDown();
  }, []);

  // load a thread, then poll for new messages while the tab is visible
  useEffect(() => {
    let stop = false;
    setLoading(true);
    setMessages([]);
    lastAt.current = null;
    stick.current = true;
    const url = new URL(window.location.href);
    if (thread === 'group') url.searchParams.delete('t'); else url.searchParams.set('t', thread);
    window.history.replaceState(null, '', url);

    fetch(`/api/chat?thread=${thread}`).then((r) => r.json()).then((d) => {
      if (stop) return;
      const list: Msg[] = d.messages ?? [];
      setMessages(list);
      lastAt.current = list.length ? list[list.length - 1].at : new Date(0).toISOString();
      setLoading(false);
      scrollDown();
    });
    const id = window.setInterval(async () => {
      if (document.hidden || !lastAt.current) return;
      const d = await fetch(`/api/chat?thread=${thread}&after=${encodeURIComponent(lastAt.current)}`).then((r) => r.json()).catch(() => null);
      if (!stop && d?.messages) merge(d.messages);
    }, POLL_MS);
    return () => { stop = true; window.clearInterval(id); };
  }, [thread, merge]);

  const pick = (f: File | null | undefined) => {
    setError('');
    if (!f) return;
    if (f.size > MAX_BYTES) { setError(`${f.name} lebih dari 4 MB`); return; }
    setFile(f);
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    setError('');
    let init: RequestInit;
    if (file) {
      const data = new FormData();
      data.set('thread', thread); data.set('body', body); data.set('file', file);
      init = { method: 'POST', body: data };
    } else {
      init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ thread, body }) };
    }
    const res = await fetch('/api/chat', init).then((r) => r.json()).catch(() => ({ error: 'Gagal mengirim. Periksa koneksi.' }));
    setSending(false);
    if (res?.message) {
      merge([res.message]);
      setText(''); setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } else setError(res?.error && res.error !== 'empty' ? res.error : 'Gagal mengirim');
  };

  const current = thread === 'group' ? null : threads.find((t) => t.id === thread);
  const shown = threads.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));
  let lastDay = '';

  return (
    <div className={`panel chat ${listOpen ? 'list-open' : ''}`}>
      <div className="chat-list">
        <button className={`chat-thread ${thread === 'group' ? 'active' : ''}`} onClick={() => { setThread('group'); setListOpen(false); }}>
          <span className="group-mark"><IconUsers /></span>
          <span style={{ minWidth: 0 }}>
            <div className="chat-thread-name">Semua anggota</div>
            <div className="chat-thread-sub">Grup IKPMR Bogor</div>
          </span>
          <span />
        </button>
        <div className="chat-list-label">Pesan pribadi</div>
        <input className="form-input" style={{ height: 36, fontSize: 14, marginBottom: 8 }} placeholder="Cari anggota" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Cari anggota" />
        {shown.map((t) => (
          <button key={t.id} className={`chat-thread ${thread === t.id ? 'active' : ''}`} onClick={() => { setThread(t.id); setListOpen(false); }}>
            <Avatar name={t.name} />
            <span style={{ minWidth: 0 }}>
              <div className="chat-thread-name">{t.name}</div>
              <div className="chat-thread-sub">{t.sub}</div>
            </span>
            <span className="cell-sub">{t.at ? time(t.at) : ''}</span>
          </button>
        ))}
      </div>

      <div
        className={`chat-pane ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragging(true); } }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files[0]); }}
      >
        <div className="chat-pane-head">
          <button type="button" className="icon-btn chat-back" onClick={() => setListOpen(true)} aria-label="Daftar percakapan"><IconArrow style={{ transform: 'scaleX(-1)' }} /></button>
          {current ? <Avatar name={current.name} /> : <span className="group-mark"><IconUsers /></span>}
          <div>
            <div className="panel-title" style={{ fontSize: 15 }}>{current ? current.name : 'Semua anggota'}</div>
            <div className="cell-sub">{current ? 'Pesan pribadi' : `${threads.length + 1} anggota aktif`}</div>
          </div>
        </div>
        <div className="chat-messages" ref={listRef} aria-live="polite" onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
          {loading && <div className="empty">Memuat</div>}
          {!loading && messages.length === 0 && <div className="empty">Belum ada pesan. Mulai obrolan.</div>}
          {messages.map((m) => {
            const mine = m.from.id === me.id;
            const day = dayKey(m.at);
            const sep = day !== lastDay ? (lastDay = day) : null;
            return (
              <div key={m.id} style={{ display: 'contents' }}>
                {sep && <div className="day-sep">{sep}</div>}
                <div className={`msg ${mine ? 'mine' : ''}`}>
                  {!mine && <Avatar name={m.from.name} />}
                  <div>
                    <div className="msg-meta">{mine ? '' : <b>{m.from.name} · </b>}{time(m.at)}</div>
                    {m.file && (isImage(m.file)
                      ? <a className="msg-image" href={m.file.url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={m.file.url} alt={m.file.name} onLoad={onMediaLoad} />
                        </a>
                      : <a className="msg-file" href={m.file.url} target="_blank" rel="noreferrer" download={m.file.name}>
                          <span className="msg-file-ext">{extOf(m.file.name)}</span>
                          <span style={{ minWidth: 0 }}>
                            <span className="msg-file-name">{m.file.name}</span>
                            <span className="msg-file-size">{fileSize(m.file.size)}</span>
                          </span>
                          <IconDownload />
                        </a>)}
                    {m.body && <div className="msg-bubble">{m.body}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <form className="chat-compose" onSubmit={send}>
          {(file || error) && (
            <div className="compose-extra">
              {file && (
                <span className="file-chip">
                  <IconFile />
                  <span className="file-chip-name">{file.name}</span>
                  <span className="file-chip-size">{fileSize(file.size)}</span>
                  <button type="button" onClick={() => { setFile(null); if (fileInput.current) fileInput.current.value = ''; }} aria-label="Batalkan file"><IconClose /></button>
                </span>
              )}
              {error && <span className="form-error" role="alert" style={{ margin: 0 }}>{error}</span>}
            </div>
          )}
          <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(e) => pick(e.target.files?.[0])} />
          <button type="button" className="btn btn-ghost attach-btn" onClick={() => fileInput.current?.click()} aria-label="Lampirkan file" title="Lampirkan file (maks. 4 MB)"><IconPaperclip /></button>
          <textarea
            className="form-input"
            placeholder={current ? `Pesan untuk ${current.name.split(' ')[0]}` : 'Pesan untuk grup'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            onPaste={(e) => { const f = e.clipboardData.files[0]; if (f) { e.preventDefault(); pick(f); } }}
            aria-label="Tulis pesan"
            maxLength={2000}
          />
          <button className="btn btn-primary" disabled={sending || (!text.trim() && !file)} aria-label="Kirim">{sending ? <span className="spinner" aria-hidden="true" /> : <IconSend />}</button>
        </form>
        {dragging && <div className="drop-hint" aria-hidden="true">Lepas untuk melampirkan</div>}
      </div>
    </div>
  );
}

// File storage shared by the gallery, landing content, merch, events, payment proofs and chat files.
// Vercel Blob when BLOB_READ_WRITE_TOKEN is set, public/uploads when running locally.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';

// Vercel rejects request bodies over 4.5 MB, so every upload stays under 4 MB.
export const MAX_UPLOAD = 4 * 1024 * 1024;

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };
// what members may send in chat: images, documents, spreadsheets, slides, plain text and zip
export const FILE_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};
export const FILE_ACCEPT = Object.keys(FILE_TYPES).join(',') + ',.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.csv,.txt,.pdf';

export type Stored = { url: string } | { error: string };

export function storageMode(): 'blob' | 'local' | 'none' {
  return process.env.BLOB_READ_WRITE_TOKEN ? 'blob' : process.env.VERCEL ? 'none' : 'local';
}

/** Returns null when no file was picked, so optional fields can be skipped. */
export function pickedFile(v: FormDataEntryValue | null): File | null {
  return v instanceof File && v.size > 0 ? v : null;
}

async function store(file: File, folder: string, ext: string): Promise<Stored> {
  // a random name: chat files are reachable only by whoever has the link
  const base = `${Date.now()}-${randomBytes(9).toString('base64url')}.${ext}`;
  const mode = storageMode();
  if (mode === 'blob') {
    const { put } = await import('@vercel/blob');
    return { url: (await put(`${folder}/${base}`, file, { access: 'public', contentType: file.type })).url };
  }
  if (mode === 'none') return { error: 'Penyimpanan file belum diatur. Hubungkan Vercel Blob dulu.' };
  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, base), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/${folder}/${base}` };
}

export async function saveImage(file: File, folder: string): Promise<Stored> {
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: 'Format foto harus JPG, PNG, WebP, atau AVIF' };
  if (file.size > MAX_UPLOAD) return { error: 'Ukuran foto maksimal 4 MB' };
  return store(file, folder, ext);
}

const DOC_EXTS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'zip']);

export async function saveFile(file: File, folder: string): Promise<Stored> {
  // browsers on Windows sometimes send an empty or generic type for Office, csv and zip files,
  // so the file name decides the extension and fills in for a missing type
  const nameExt = (file.name.split('.').pop() ?? '').toLowerCase();
  const generic = !file.type || file.type === 'application/octet-stream';
  const ext = FILE_TYPES[file.type] && !(DOC_EXTS.has(nameExt) && !file.type.startsWith('image/'))
    ? FILE_TYPES[file.type]
    : (FILE_TYPES[file.type] || generic) && DOC_EXTS.has(nameExt) ? nameExt : null;
  if (!ext) return { error: 'Jenis file ini tidak bisa dikirim. Pakai foto, PDF, dokumen Office, teks, atau zip.' };
  if (file.size > MAX_UPLOAD) return { error: 'Ukuran file maksimal 4 MB' };
  return store(file, folder, ext);
}

export async function removeImage(url: string | null | undefined) {
  if (!url) return;
  if (url.includes('blob.vercel-storage.com') && process.env.BLOB_READ_WRITE_TOKEN) {
    const { del } = await import('@vercel/blob');
    await del(url).catch(() => null);
  } else if (url.startsWith('/uploads/')) {
    const file = path.normalize(path.join(process.cwd(), 'public', url));
    if (file.startsWith(path.join(process.cwd(), 'public', 'uploads'))) await unlink(file).catch(() => null);
  }
}

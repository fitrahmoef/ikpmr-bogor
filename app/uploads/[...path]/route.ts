// Local mode only: `next start` serves public/ as it was at startup, so files uploaded afterwards
// (gallery, chat, proofs) would 404. Files that already existed are still served by Next itself.
// On Vercel every upload goes to Vercel Blob and this route never sees a request.
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif',
  pdf: 'application/pdf', txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8', zip: 'application/zip',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const root = path.join(process.cwd(), 'public', 'uploads');
  const file = path.normalize(path.join(root, ...(await params).path));
  if (!file.startsWith(root + path.sep)) return new Response('Not found', { status: 404 });
  try {
    const data = await readFile(file);
    const ext = path.extname(file).slice(1).toLowerCase();
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': TYPES[ext] ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable', // names are random and never reused
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { liveUser } from '@/lib/guard';
import { pickedFile, saveFile } from '@/lib/upload';
import type { ChatMessage } from '@prisma/client';

// Chat over polling: works on Vercel serverless without a socket server.
// thread = "group" for everyone, or another user's id for a personal conversation.

async function active() {
  const u = await liveUser();
  if (!u) return null;
  if (u.status !== 'ACTIVE' && u.role !== 'ADMIN') return null;
  return u;
}

type WithSender = ChatMessage & { sender: { id: string; name: string } };
const toJson = (m: WithSender) => ({
  id: m.id, body: m.body, at: m.createdAt.toISOString(), from: m.sender,
  file: m.fileUrl ? { url: m.fileUrl, name: m.fileName ?? 'file', type: m.fileType ?? '', size: m.fileSize ?? 0 } : null,
});

const whereFor = (me: string, thread: string) =>
  thread === 'group'
    ? { recipientId: null }
    : { OR: [{ senderId: me, recipientId: thread }, { senderId: thread, recipientId: me }] };

export async function GET(req: Request) {
  const me = await active();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const thread = url.searchParams.get('thread') ?? 'group';
  const after = url.searchParams.get('after');
  const messages = await prisma.chatMessage.findMany({
    where: { ...whereFor(me.id, thread), ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    orderBy: { createdAt: after ? 'asc' : 'desc' },
    take: after ? 100 : 60,
    include: { sender: { select: { id: true, name: true } } },
  });
  if (!after) messages.reverse();
  return NextResponse.json({ messages: messages.map(toJson) });
}

// JSON for text only, multipart/form-data when a file is attached (thread, body, file)
export async function POST(req: Request) {
  const me = await active();
  if (!me) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  let thread: string | undefined, body: string | undefined, file: File | null = null;
  if ((req.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
    const f = await req.formData().catch(() => null);
    if (!f) return NextResponse.json({ error: 'File terlalu besar atau rusak' }, { status: 400 });
    thread = String(f.get('thread') ?? ''); body = String(f.get('body') ?? ''); file = pickedFile(f.get('file'));
  } else {
    ({ thread, body } = (await req.json().catch(() => ({}))) as { thread?: string; body?: string });
  }
  const text = String(body ?? '').trim().slice(0, 2000);
  if (!text && !file) return NextResponse.json({ error: 'empty' }, { status: 400 });
  let recipientId: string | null = null;
  if (thread && thread !== 'group') {
    const other = await prisma.user.findUnique({ where: { id: thread }, select: { id: true } });
    if (!other || other.id === me.id) return NextResponse.json({ error: 'bad thread' }, { status: 400 });
    recipientId = other.id;
  }
  let attachment = {};
  if (file) {
    const saved = await saveFile(file, 'chat');
    if ('error' in saved) return NextResponse.json({ error: saved.error }, { status: 400 });
    attachment = { fileUrl: saved.url, fileName: file.name.slice(0, 160) || 'file', fileType: file.type || null, fileSize: file.size };
  }
  const m = await prisma.chatMessage.create({
    data: { body: text, senderId: me.id, recipientId, ...attachment },
    include: { sender: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ message: toJson(m) });
}

'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { mustBeAdmin } from '@/lib/guard';
import { GROUPS } from '@/lib/content';
import { pickedFile, removeImage, saveImage } from '@/lib/upload';
import type { FormState } from './public';

// Saves one group of landing page fields. Text equal to the default (or empty) clears the override,
// so changing a default in lib/content.ts still reaches pages nobody edited.
export async function saveContentGroup(_: FormState, f: FormData): Promise<FormState> {
  await mustBeAdmin();
  const group = GROUPS.find((g) => g.id === String(f.get('group') ?? ''));
  if (!group) return { error: 'Bagian tidak dikenal' };
  const current = new Map((await prisma.siteContent.findMany({ where: { key: { in: group.fields.map((x) => x.key) } } })).map((r) => [r.key, r.value]));

  for (const field of group.fields) {
    if (field.kind === 'image') {
      const file = pickedFile(f.get(field.key));
      const old = current.get(field.key);
      if (file) {
        const saved = await saveImage(file, 'konten');
        if ('error' in saved) return { error: `${field.label}: ${saved.error}` };
        await prisma.siteContent.upsert({ where: { key: field.key }, create: { key: field.key, value: saved.url }, update: { value: saved.url } });
        await removeImage(old);
      } else if (f.get(`${field.key}__remove`) === 'on' && old) {
        await prisma.siteContent.delete({ where: { key: field.key } });
        await removeImage(old);
      }
      continue;
    }
    const max = field.kind === 'long' ? 2000 : 200;
    const value = String(f.get(field.key) ?? '').trim().slice(0, max);
    if (!value || value === field.def) await prisma.siteContent.deleteMany({ where: { key: field.key } });
    else await prisma.siteContent.upsert({ where: { key: field.key }, create: { key: field.key, value }, update: { value } });
  }
  revalidatePath('/');
  revalidatePath('/toko');
  revalidatePath('/anggota/kelola/konten');
  return { ok: true, message: `${group.title} disimpan` };
}

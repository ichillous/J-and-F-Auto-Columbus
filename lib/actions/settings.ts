'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { requireAdmin } from '@/lib/auth';
import { upsertSettings, CACHE_TAGS } from '@/lib/data';
import type { Settings } from '@/lib/types';

export async function saveSettingsAction(patch: Partial<Settings>): Promise<void> {
  await requireAdmin();
  await upsertSettings(patch);
  revalidateTag(CACHE_TAGS.settings);
  revalidatePath('/');
  revalidatePath('/contact');
  revalidatePath('/inventory');
  revalidatePath('/admin/settings');
}

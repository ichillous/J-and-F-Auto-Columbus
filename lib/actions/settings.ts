'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '@/lib/auth';
import { upsertSettings } from '@/lib/data';
import type { Settings } from '@/lib/types';

export async function saveSettingsAction(patch: Partial<Settings>): Promise<void> {
  await requireAdmin();
  await upsertSettings(patch);
  revalidatePath('/');
  revalidatePath('/contact');
  revalidatePath('/inventory');
  revalidatePath('/admin/settings');
}

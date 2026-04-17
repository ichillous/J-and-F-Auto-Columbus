'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth';
import { createLead, updateLeadStatus, type LeadInput } from '@/lib/data';
import type { Lead } from '@/lib/types';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function submitLeadAction(input: {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  preferred_datetime?: string;
  car_id?: string | null;
  type: Lead['type'];
  source_page?: string | null;
}): Promise<void> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name || name.length > 200) throw new Error('Name is required');
  if (!isEmail(email)) throw new Error('Valid email required');

  await createLead({
    name,
    email,
    phone: input.phone?.trim() || null,
    message: input.message?.trim() || null,
    preferred_datetime: input.preferred_datetime || null,
    car_id: input.car_id ?? null,
    type: input.type,
    source_page: input.source_page ?? null,
  } as LeadInput);

  revalidatePath('/admin/leads');
  revalidatePath('/admin');
}

export async function updateLeadStatusAction(id: string, status: Lead['status']): Promise<void> {
  await requireRole(['admin', 'staff']);
  await updateLeadStatus(id, status);
  revalidatePath('/admin/leads');
  revalidatePath(`/admin/leads/${id}`);
  revalidatePath('/admin');
}

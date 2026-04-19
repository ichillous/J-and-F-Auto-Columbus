'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/auth';
import { createLead, updateLeadStatus, type LeadInput } from '@/lib/data';
import type { Lead } from '@/lib/types';

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const PHONE_RE = /^[+\d][\d\s\-().]{4,30}$/;

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

  const phone = input.phone?.trim() || null;
  if (phone && !PHONE_RE.test(phone)) throw new Error('Invalid phone number');

  const message = input.message?.trim().slice(0, 2000) || null;

  let preferred_datetime: string | null = null;
  if (input.preferred_datetime) {
    const d = new Date(input.preferred_datetime);
    if (Number.isNaN(d.getTime())) throw new Error('Invalid preferred date/time');
    preferred_datetime = d.toISOString();
  }

  await createLead({
    name,
    email,
    phone,
    message,
    preferred_datetime,
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

'use server';

import { revalidatePath } from 'next/cache';

import { requireAdminOrStaff } from '@/lib/auth';
import { upsertCar, deleteCar, type CarInput } from '@/lib/data';
import type { Car } from '@/lib/types';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function saveCarAction(input: CarInput): Promise<{ id: string }> {
  await requireAdminOrStaff();
  const slug = input.slug?.trim() || slugify(`${input.year}-${input.make}-${input.model}-${input.trim ?? ''}`);
  const car = await upsertCar({ ...input, slug });
  revalidatePath('/admin/cars');
  revalidatePath('/inventory');
  revalidatePath(`/cars/${car.slug}`);
  return { id: car.id };
}

export async function deleteCarAction(id: string): Promise<void> {
  await requireAdminOrStaff();
  await deleteCar(id);
  revalidatePath('/admin/cars');
  revalidatePath('/inventory');
}

export type { Car };

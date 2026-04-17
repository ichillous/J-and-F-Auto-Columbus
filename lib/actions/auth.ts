'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { loginWithPassword, updateUserFullName } from '@/lib/aws/cognito';
import { requireAuth, SESSION_COOKIE } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'Email and password are required.' };

  let result;
  try {
    result = await loginWithPassword(email, password);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Login failed.' };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, result.idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: result.expiresInSeconds,
  });

  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect('/admin/login');
}

export async function updateProfileAction(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const session = await requireAuth();
  const fullName = String(formData.get('full_name') ?? '').trim();
  try {
    await updateUserFullName(session.email, fullName || null);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Update failed.' };
  }
  revalidatePath('/admin/profile');
  return { success: true };
}

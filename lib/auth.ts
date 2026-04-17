import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { verifySessionToken, type AdminSession } from '@/lib/aws/cognito';
import type { ProfileRole } from '@/lib/types';

export const SESSION_COOKIE = 'jfauto_session';

export const getSession = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
});

export async function requireAuth(): Promise<AdminSession> {
  const session = await getSession();
  if (!session) redirect('/admin/login');
  return session;
}

export async function requireRole(allowed: ProfileRole[]): Promise<AdminSession> {
  const session = await getSession();
  if (!session || !allowed.includes(session.role)) redirect('/admin/login');
  return session;
}

export async function requireAdmin(): Promise<AdminSession> {
  return requireRole(['admin']);
}

export async function requireAdminOrStaff(): Promise<AdminSession> {
  return requireRole(['admin', 'staff']);
}

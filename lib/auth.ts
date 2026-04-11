import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile, ProfileRole } from '@/lib/types';

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  return profile;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/admin/login');
  }
  return user;
}

export async function requireRole(allowedRoles: ProfileRole[]) {
  const profile = await getCurrentProfile();
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/admin/login');
  }
  return profile;
}

export async function requireAdminOrStaff() {
  return requireRole(['admin', 'staff']);
}

export async function requireAdmin() {
  return requireRole(['admin']);
}


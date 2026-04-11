import { requireAuth } from '@/lib/auth';
import { getCurrentProfile } from '@/lib/auth';
import { ProfileForm } from '@/components/admin/profile-form';
import { createClient } from '@/lib/supabase/server';
import { unstable_noStore } from 'next/cache';
import { User } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin-page-header';

export default async function AdminProfilePage() {
  await requireAuth();
  unstable_noStore();
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const profile = await getCurrentProfile();

  if (!user || !profile) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Profile" icon={<User className="h-8 w-8 text-accent" />} />
        <p className="text-destructive font-medium">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Profile"
        description="Manage your account information and review the role currently assigned to your user."
        icon={<User className="h-8 w-8 text-accent" />}
      />
      <ProfileForm user={user} profile={profile} />
    </div>
  );
}

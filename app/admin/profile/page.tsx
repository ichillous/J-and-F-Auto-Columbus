import { User } from 'lucide-react';

import { requireAuth } from '@/lib/auth';
import { ProfileForm } from '@/components/admin/profile-form';
import { AdminPageHeader } from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';

export default async function AdminProfilePage() {
  const session = await requireAuth();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Profile"
        description="Manage your account information and review the role currently assigned to your user."
        icon={<User className="h-8 w-8 text-accent" />}
      />
      <ProfileForm session={session} />
    </div>
  );
}

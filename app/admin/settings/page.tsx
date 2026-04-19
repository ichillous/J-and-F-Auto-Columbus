import { Settings } from 'lucide-react';

import { requireAdmin } from '@/lib/auth';
import { getSettings } from '@/lib/data';
import { SettingsForm } from '@/components/admin/settings-form';
import { AdminPageHeader } from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdmin();
  const settings = await getSettings();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dealership Settings"
        description="Configure dealership information, contact details, branding, and business hours."
        icon={<Settings className="h-8 w-8 text-accent" />}
      />
      <SettingsForm settings={settings} />
    </div>
  );
}

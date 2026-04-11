import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { SettingsForm } from '@/components/admin/settings-form';
import { unstable_noStore } from 'next/cache';
import { Settings } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin-page-header';

export default async function AdminSettingsPage() {
  await requireAdmin();
  unstable_noStore();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (!settings) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Dealership Settings" icon={<Settings className="h-8 w-8 text-accent" />} />
        <p className="text-destructive font-medium">Settings not found</p>
      </div>
    );
  }

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

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth';
import { LeadsTable } from '@/components/admin/leads-table';
import { unstable_noStore } from 'next/cache';
import { Mail } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin-page-header';

interface SearchParams {
  type?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  [key: string]: string | undefined;
}

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(['admin', 'staff', 'readonly']);
  unstable_noStore();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  let query = supabase
    .from('leads')
    .select(`
      *,
      cars (
        title,
        slug
      )
    `)
    .order('created_at', { ascending: false });

  if (resolvedSearchParams.type) {
    query = query.eq('type', resolvedSearchParams.type);
  }

  if (resolvedSearchParams.status) {
    query = query.eq('status', resolvedSearchParams.status);
  }

  if (resolvedSearchParams.fromDate) {
    query = query.gte('created_at', resolvedSearchParams.fromDate);
  }

  if (resolvedSearchParams.toDate) {
    query = query.lte('created_at', resolvedSearchParams.toDate);
  }

  const { data: leads } = await query;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leads"
        description="Review live inquiries, update statuses, and move from first contact to closed conversation."
        icon={<Mail className="h-8 w-8 text-accent" />}
      />
      <LeadsTable leads={leads || []} initialSearchParams={resolvedSearchParams} />
    </div>
  );
}

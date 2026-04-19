import { Mail } from 'lucide-react';

import { requireRole } from '@/lib/auth';
import { batchGetCarsByIds, listLeads } from '@/lib/data';
import { LeadsTable, type LeadWithCar } from '@/components/admin/leads-table';
import { AdminPageHeader } from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';

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
  const resolved = await searchParams;

  let leads = await listLeads();

  if (resolved.type) leads = leads.filter((l) => l.type === resolved.type);
  if (resolved.status) leads = leads.filter((l) => l.status === resolved.status);
  if (resolved.fromDate) leads = leads.filter((l) => l.created_at >= resolved.fromDate!);
  if (resolved.toDate) leads = leads.filter((l) => l.created_at <= resolved.toDate!);

  const carIds = leads.map((l) => l.car_id).filter((id): id is string => Boolean(id));
  const carMap = await batchGetCarsByIds(carIds);

  const leadsWithCars: LeadWithCar[] = leads.map((lead) => {
    const car = lead.car_id ? carMap.get(lead.car_id) : null;
    return {
      ...lead,
      car: car ? { title: car.title, slug: car.slug } : null,
    };
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Leads"
        description="Review live inquiries, update statuses, and move from first contact to closed conversation."
        icon={<Mail className="h-8 w-8 text-accent" />}
      />
      <LeadsTable leads={leadsWithCars} initialSearchParams={resolved} />
    </div>
  );
}

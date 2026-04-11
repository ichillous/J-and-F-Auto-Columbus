import { createClient } from '@/lib/supabase/server';
import { requireAdminOrStaff } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CarsTable } from '@/components/admin/cars-table';
import { unstable_noStore } from 'next/cache';
import { Plus, Car } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin-page-header';

interface SearchParams {
  status?: string;
  search?: string;
  [key: string]: string | undefined;
}

export default async function AdminCarsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdminOrStaff();
  unstable_noStore();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  let query = supabase.from('cars').select('*');

  if (resolvedSearchParams.status) {
    query = query.eq('status', resolvedSearchParams.status);
  }

  if (resolvedSearchParams.search) {
    const searchTerm = resolvedSearchParams.search.toLowerCase();
    query = query.or(`title.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
  }

  query = query.order('updated_at', { ascending: false });

  const { data: cars } = await query;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cars"
        description={`Manage your live vehicle inventory (${cars?.length || 0} total).`}
        icon={<Car className="h-8 w-8 text-accent" />}
        actions={(
          <Button asChild variant="accent" size="lg">
            <Link href="/admin/cars/new">
              <Plus className="h-4 w-4" />
              Add Car
            </Link>
          </Button>
        )}
      />

      <CarsTable cars={cars || []} initialSearchParams={resolvedSearchParams} />
    </div>
  );
}

import Link from 'next/link';
import { Plus, Car } from 'lucide-react';

import { requireAdminOrStaff } from '@/lib/auth';
import { listAllCars } from '@/lib/data';
import { AdminPageHeader } from '@/components/admin-page-header';
import { CarsTable } from '@/components/admin/cars-table';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

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
  const resolved = await searchParams;

  let cars = await listAllCars();

  if (resolved.status) {
    cars = cars.filter((c) => c.status === resolved.status);
  }
  if (resolved.search) {
    const term = resolved.search.toLowerCase();
    cars = cars.filter(
      (c) =>
        c.title.toLowerCase().includes(term) ||
        c.make.toLowerCase().includes(term) ||
        c.model.toLowerCase().includes(term),
    );
  }
  cars.sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Cars"
        description={`Manage your live vehicle inventory (${cars.length} total).`}
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

      <CarsTable cars={cars} initialSearchParams={resolved} />
    </div>
  );
}

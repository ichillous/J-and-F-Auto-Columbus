import { notFound } from 'next/navigation';
import { Car } from 'lucide-react';

import { requireAdminOrStaff } from '@/lib/auth';
import { getCarById } from '@/lib/data';
import { CarForm } from '@/components/admin/car-form';
import { AdminPageHeader } from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrStaff();
  const { id } = await params;

  const car = await getCarById(id);
  if (!car) notFound();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Edit Car"
        description="Update live inventory details, imagery, and publication status."
        icon={<Car className="h-8 w-8 text-accent" />}
        backHref="/admin/cars"
        backLabel="Back to Cars"
      />

      <CarForm car={car} />
    </div>
  );
}

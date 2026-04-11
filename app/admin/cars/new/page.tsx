import { requireAdminOrStaff } from '@/lib/auth';
import { CarForm } from '@/components/admin/car-form';
import { Car } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin-page-header';

export default async function NewCarPage() {
  await requireAdminOrStaff();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Add New Car"
        description="Create a new live inventory record using the current schema and asset pipeline."
        icon={<Car className="h-8 w-8 text-accent" />}
        backHref="/admin/cars"
        backLabel="Back to Cars"
      />

      <CarForm />
    </div>
  );
}

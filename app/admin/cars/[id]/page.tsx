import { createClient } from '@/lib/supabase/server';
import { requireAdminOrStaff } from '@/lib/auth';
import { CarForm } from '@/components/admin/car-form';
import { notFound } from 'next/navigation';
import { unstable_noStore } from 'next/cache';
import { Car } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin-page-header';

export default async function EditCarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminOrStaff();
  unstable_noStore();
  const supabase = await createClient();
  const { id } = await params;

  const { data: car } = await supabase
    .from('cars')
    .select('*')
    .eq('id', id)
    .single();

  if (!car) {
    notFound();
  }

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

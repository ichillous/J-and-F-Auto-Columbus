import Link from 'next/link';
import { ArrowLeft, Calendar, Car as CarIcon, Cog, Fuel, Gauge, Settings } from 'lucide-react';
import { notFound } from 'next/navigation';

import { CarImageSlideshow } from '@/components/car-image-slideshow';
import { LeadFormModal } from '@/components/lead-form-modal';
import { PublicShell } from '@/components/public-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getCarBySlug, getSettings } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function CarDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [car, settings] = await Promise.all([getCarBySlug(slug), getSettings()]);

  if (!car || car.status === 'draft') {
    notFound();
  }

  const gallery = Array.isArray(car.gallery) ? car.gallery : [];
  const allImages = car.hero_image_url ? [car.hero_image_url, ...gallery] : gallery;

  const specCards = [
    { label: 'Year', value: String(car.year), icon: Calendar },
    { label: 'Make', value: car.make, icon: CarIcon },
    { label: 'Model', value: car.model, icon: Settings },
    car.trim ? { label: 'Trim', value: car.trim, icon: Cog } : null,
    car.mileage ? { label: 'Mileage', value: `${car.mileage.toLocaleString()} mi`, icon: Gauge } : null,
    car.body_type ? { label: 'Body Type', value: car.body_type, icon: CarIcon } : null,
    car.transmission ? { label: 'Transmission', value: car.transmission, icon: Cog } : null,
    car.fuel_type ? { label: 'Fuel Type', value: car.fuel_type, icon: Fuel } : null,
  ].filter(Boolean) as Array<{ label: string; value: string; icon: typeof Calendar }>;

  return (
    <PublicShell currentPath="/inventory" settings={settings}>
      <div className="shell-container space-y-8 py-10 sm:py-12 lg:py-16">
        <Button asChild variant="ghost" className="px-0 text-brand-silver hover:bg-transparent hover:text-white">
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
            Back to Inventory
          </Link>
        </Button>

        <section className="grid gap-8 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={car.status === 'sold' ? 'destructive' : 'accent'} size="lg">
                  {car.status === 'sold' ? 'Sold' : 'Available'}
                </Badge>
                {car.body_type ? <Badge variant="secondary">{car.body_type}</Badge> : null}
                {car.fuel_type ? <Badge variant="secondary">{car.fuel_type}</Badge> : null}
              </div>
              <div className="space-y-2">
                <p className="section-kicker">{car.make}</p>
                <h1 className="page-title text-balance">{car.title}</h1>
                <p className="text-sm uppercase tracking-[0.24em] text-brand-dim">
                  {car.year} {car.model}
                </p>
              </div>
            </div>

            <CarImageSlideshow images={allImages} title={car.title} />

            {car.description ? (
              <Card>
                <CardContent className="space-y-4 p-7">
                  <p className="section-kicker">Description</p>
                  <div className="text-sm leading-8 text-brand-dim whitespace-pre-line">
                    {car.description}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-28">
              <CardContent className="space-y-6 p-7">
                <div className="space-y-2 border-b border-white/8 pb-5">
                  <p className="section-kicker">Price</p>
                  <p className="font-display text-5xl text-white">${Number(car.price).toLocaleString()}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {specCards.slice(0, 6).map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="mb-3 inline-flex rounded-full border border-accent/20 bg-accent/10 p-2">
                        <Icon className="h-4 w-4 text-accent" />
                      </div>
                      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-brand-dim">{label}</p>
                      <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-white">{value}</p>
                    </div>
                  ))}
                </div>

                {car.status !== 'sold' ? (
                  <div className="space-y-3">
                    <LeadFormModal carId={car.id} carTitle={car.title} type="request_info">
                      <Button variant="accent" size="xl" className="w-full">
                        Request More Info
                      </Button>
                    </LeadFormModal>
                    <LeadFormModal carId={car.id} carTitle={car.title} type="test_drive">
                      <Button variant="outline" size="xl" className="w-full">
                        Schedule Test Drive
                      </Button>
                    </LeadFormModal>
                  </div>
                ) : (
                  <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/8 p-5 text-center text-sm text-brand-dim">
                    This vehicle is marked sold in your live inventory.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

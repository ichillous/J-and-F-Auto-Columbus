import { Search } from 'lucide-react';
import { unstable_noStore } from 'next/cache';

import { InventoryFilters } from '@/components/inventory-filters';
import { InventoryVehicleCard } from '@/components/inventory-vehicle-card';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

interface SearchParams {
  search?: string;
  bodyType?: string;
  fuelType?: string;
  minYear?: string;
  maxYear?: string;
  minPrice?: string;
  maxPrice?: string;
  sort?: string;
  [key: string]: string | undefined;
}

const sortLabels: Record<string, string> = {
  newest: 'Newest Arrival',
  'price-low': 'Price Ascending',
  'price-high': 'Price Descending',
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  unstable_noStore();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;

  let query = supabase.from('cars').select('*').eq('status', 'published');

  if (resolvedSearchParams.search) {
    const searchTerm = resolvedSearchParams.search.toLowerCase();
    query = query.or(`title.ilike.%${searchTerm}%,make.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%`);
  }

  if (resolvedSearchParams.bodyType) {
    query = query.eq('body_type', resolvedSearchParams.bodyType);
  }

  if (resolvedSearchParams.fuelType) {
    query = query.eq('fuel_type', resolvedSearchParams.fuelType);
  }

  if (resolvedSearchParams.minYear) {
    query = query.gte('year', Number.parseInt(resolvedSearchParams.minYear, 10));
  }

  if (resolvedSearchParams.maxYear) {
    query = query.lte('year', Number.parseInt(resolvedSearchParams.maxYear, 10));
  }

  if (resolvedSearchParams.minPrice) {
    query = query.gte('price', Number.parseFloat(resolvedSearchParams.minPrice));
  }

  if (resolvedSearchParams.maxPrice) {
    query = query.lte('price', Number.parseFloat(resolvedSearchParams.maxPrice));
  }

  const sortBy = resolvedSearchParams.sort || 'newest';
  if (sortBy === 'price-low') {
    query = query.order('price', { ascending: true });
  } else if (sortBy === 'price-high') {
    query = query.order('price', { ascending: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: cars } = await query;

  const { data: allCars } = await supabase
    .from('cars')
    .select('body_type, fuel_type, year, price')
    .eq('status', 'published');

  const bodyTypes = Array.from(new Set((allCars ?? []).map((car) => car.body_type).filter(Boolean))) as string[];
  const fuelTypes = Array.from(new Set((allCars ?? []).map((car) => car.fuel_type).filter(Boolean))) as string[];
  const years = (allCars ?? []).map((car) => car.year).filter((year): year is number => typeof year === 'number');
  const prices = (allCars ?? []).map((car) => Number(car.price)).filter((price) => Number.isFinite(price));

  const minYear = years.length > 0 ? Math.min(...years) : 2000;
  const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
  const minPriceBound = prices.length > 0 ? Math.floor(Math.min(...prices) / 1000) * 1000 : 0;
  const maxPriceBound = prices.length > 0 ? Math.ceil(Math.max(...prices) / 1000) * 1000 : 100000;

  return (
    <PublicShell currentPath="/inventory">
      <div className="shell-container py-10 sm:py-12 lg:py-16">
        <section className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="section-kicker">Current Inventory</p>
            <h1 className="page-title text-balance">Available Machines Ready For Immediate Dispatch.</h1>
            <p className="page-subtitle">
              The current collection is built from the vehicles already in your live inventory. The experience is now premium, but it still reflects only real records in your database.
            </p>
          </div>
          <div className="glass-panel flex min-w-[240px] flex-col rounded-[1.5rem] px-5 py-4 text-sm text-brand-dim">
            <span className="section-kicker mb-2">Sort</span>
            <span className="font-display text-2xl text-white">{sortLabels[sortBy] || sortLabels.newest}</span>
            <span>{cars?.length || 0} live vehicles</span>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[280px,1fr] xl:grid-cols-[300px,1fr]">
          <InventoryFilters
            bodyTypes={bodyTypes}
            fuelTypes={fuelTypes}
            minYear={minYear}
            maxYear={maxYear}
            minPriceBound={minPriceBound}
            maxPriceBound={maxPriceBound}
            initialSearchParams={resolvedSearchParams}
          />

          <section className="space-y-8">
            <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="section-kicker">Showing</p>
                <h2 className="font-display text-3xl text-white">{cars?.length || 0} Vehicles</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-brand-dim">
                Search, body style, fuel type, year, and price stay tied to your live dataset. No seeded inventory has been introduced.
              </p>
            </div>

            {cars && cars.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {cars.map((car) => (
                  <InventoryVehicleCard key={car.id} car={car} />
                ))}
              </div>
            ) : (
              <Card className="rounded-[2rem]">
                <CardContent className="flex min-h-[420px] flex-col items-center justify-center gap-6 text-center">
                  <div className="rounded-full border border-white/10 bg-white/[0.04] p-6">
                    <Search className="h-10 w-10 text-accent/80" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-4xl text-white">No Inventory Match</h3>
                    <p className="max-w-md text-sm leading-7 text-brand-dim">
                      Nothing in the live inventory currently matches this combination of filters. Reset the rail or widen your price and year range.
                    </p>
                  </div>
                  <Button variant="accent" size="lg" asChild>
                    <a href="/inventory">Clear Filters</a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </section>
        </div>
      </div>
    </PublicShell>
  );
}

import Link from 'next/link';
import { Search } from 'lucide-react';

import { InventoryFilters } from '@/components/inventory-filters';
import { InventoryVehicleCard } from '@/components/inventory-vehicle-card';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSettings, listPublishedCars } from '@/lib/data';
import type { Car } from '@/lib/types';

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

export const dynamic = 'force-dynamic';

const sortLabels: Record<string, string> = {
  newest: 'Newest Arrival',
  'price-low': 'Price Ascending',
  'price-high': 'Price Descending',
};

function applyFilters(cars: Car[], params: SearchParams): Car[] {
  let result = cars;
  if (params.search) {
    const term = params.search.toLowerCase();
    result = result.filter((c) =>
      [c.title, c.make, c.model].some((field) => field?.toLowerCase().includes(term)),
    );
  }
  if (params.bodyType) result = result.filter((c) => c.body_type === params.bodyType);
  if (params.fuelType) result = result.filter((c) => c.fuel_type === params.fuelType);
  if (params.minYear) {
    const min = Number.parseInt(params.minYear, 10);
    result = result.filter((c) => c.year >= min);
  }
  if (params.maxYear) {
    const max = Number.parseInt(params.maxYear, 10);
    result = result.filter((c) => c.year <= max);
  }
  if (params.minPrice) {
    const min = Number.parseFloat(params.minPrice);
    result = result.filter((c) => Number(c.price) >= min);
  }
  if (params.maxPrice) {
    const max = Number.parseFloat(params.maxPrice);
    result = result.filter((c) => Number(c.price) <= max);
  }
  return result;
}

function sortCars(cars: Car[], sortBy: string): Car[] {
  const copy = [...cars];
  if (sortBy === 'price-low') copy.sort((a, b) => Number(a.price) - Number(b.price));
  else if (sortBy === 'price-high') copy.sort((a, b) => Number(b.price) - Number(a.price));
  else copy.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  return copy;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [settings, allCars] = await Promise.all([getSettings(), listPublishedCars()]);
  const resolvedSearchParams = await searchParams;

  const filtered = applyFilters(allCars, resolvedSearchParams);
  const sortBy = resolvedSearchParams.sort || 'newest';
  const cars = sortCars(filtered, sortBy);

  const bodyTypes = Array.from(new Set(allCars.map((c) => c.body_type).filter(Boolean))) as string[];
  const fuelTypes = Array.from(new Set(allCars.map((c) => c.fuel_type).filter(Boolean))) as string[];
  const years = allCars.map((c) => c.year).filter((y): y is number => typeof y === 'number');
  const prices = allCars.map((c) => Number(c.price)).filter((p) => Number.isFinite(p));

  const minYear = years.length > 0 ? Math.min(...years) : 2000;
  const maxYear = years.length > 0 ? Math.max(...years) : new Date().getFullYear();
  const minPriceBound = prices.length > 0 ? Math.floor(Math.min(...prices) / 1000) * 1000 : 0;
  const maxPriceBound = prices.length > 0 ? Math.ceil(Math.max(...prices) / 1000) * 1000 : 100000;
  const hasLiveInventory = allCars.length > 0;
  const hasActiveFilters = Object.entries(resolvedSearchParams).some(([, value]) => Boolean(value));

  return (
    <PublicShell currentPath="/inventory" settings={settings}>
      <div className="shell-container py-10 sm:py-12 lg:py-16">
        <section className="mb-10 grid gap-6 border-b border-white/8 pb-8 lg:grid-cols-[1fr,auto] lg:items-end">
          <div className="space-y-3">
            <p className="section-kicker">Current Inventory</p>
            <h1 className="font-display text-4xl uppercase tracking-[0.05em] text-white sm:text-5xl lg:text-6xl">
              Current Inventory
            </h1>
            <p className="page-subtitle max-w-3xl">
              Available precision machines ready for immediate dispatch.
            </p>
          </div>
          <div className="glass-panel min-w-[240px] rounded-[1.5rem] px-5 py-4 text-sm text-brand-dim">
            <p className="section-kicker">Sort By</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <span className="font-display text-2xl text-white">{sortLabels[sortBy] || sortLabels.newest}</span>
              <span className="text-xs uppercase tracking-[0.18em] text-brand-dim">{cars.length} visible</span>
            </div>
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
                <h2 className="font-display text-3xl text-white">{cars.length} Vehicles</h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-brand-dim">
                Refine by search, body style, fuel type, year, and price to narrow the current collection.
              </p>
            </div>

            {cars.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {cars.map((car) => (
                  <InventoryVehicleCard key={car.id} car={car} />
                ))}
              </div>
            ) : !hasLiveInventory ? (
              <Card className="rounded-[2rem]">
                <CardContent className="flex min-h-[460px] flex-col items-center justify-center gap-6 text-center">
                  <div className="rounded-full border border-accent/18 bg-accent/8 px-5 py-2 text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-accent">
                    Collection Standby
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-display text-4xl text-white">Inventory Publishing Has Not Started Yet</h3>
                    <p className="max-w-2xl text-sm leading-7 text-brand-dim">
                      Once vehicles are published, this page will populate automatically with the current collection, detail pages, and inquiry-ready listings.
                    </p>
                  </div>
                  <Button variant="accent" size="lg" asChild>
                    <Link href="/contact">Contact The Dealership</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-[2rem]">
                <CardContent className="flex min-h-[420px] flex-col items-center justify-center gap-6 text-center">
                  <div className="rounded-full border border-white/10 bg-white/[0.04] p-6">
                    <Search className="h-10 w-10 text-accent/80" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display text-4xl text-white">No Inventory Match</h3>
                    <p className="max-w-md text-sm leading-7 text-brand-dim">
                      Nothing in the current collection matches this selection. Reset the filters or widen your price and year range.
                    </p>
                  </div>
                  <Button variant={hasActiveFilters ? 'accent' : 'outline'} size="lg" asChild>
                    <Link href="/inventory">Clear Filters</Link>
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

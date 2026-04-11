'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';

import { ClientOnly } from '@/components/client-only';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface InventoryFiltersProps {
  bodyTypes: string[];
  fuelTypes: string[];
  minYear: number;
  maxYear: number;
  minPriceBound: number;
  maxPriceBound: number;
  initialSearchParams: Record<string, string | undefined>;
}

export function InventoryFilters({
  bodyTypes,
  fuelTypes,
  minYear,
  maxYear,
  minPriceBound,
  maxPriceBound,
  initialSearchParams,
}: InventoryFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearchParams.search || '');
  const [bodyType, setBodyType] = useState(initialSearchParams.bodyType || '');
  const [fuelType, setFuelType] = useState(initialSearchParams.fuelType || '');
  const [minYearFilter, setMinYearFilter] = useState(initialSearchParams.minYear || '');
  const [maxYearFilter, setMaxYearFilter] = useState(initialSearchParams.maxYear || '');
  const [minPrice, setMinPrice] = useState(initialSearchParams.minPrice || '');
  const [maxPrice, setMaxPrice] = useState(initialSearchParams.maxPrice || '');
  const [sort, setSort] = useState(initialSearchParams.sort || 'newest');

  const activeFilterCount = [
    search,
    bodyType,
    fuelType,
    minYearFilter,
    maxYearFilter,
    minPrice,
    maxPrice,
  ].filter(Boolean).length;

  const applyFilters = () => {
    const params = new URLSearchParams();

    if (search) params.set('search', search);
    if (bodyType) params.set('bodyType', bodyType);
    if (fuelType) params.set('fuelType', fuelType);
    if (minYearFilter) params.set('minYear', minYearFilter);
    if (maxYearFilter) params.set('maxYear', maxYearFilter);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sort && sort !== 'newest') params.set('sort', sort);

    startTransition(() => {
      router.push(params.size ? `/inventory?${params.toString()}` : '/inventory');
    });
  };

  const clearFilters = () => {
    setSearch('');
    setBodyType('');
    setFuelType('');
    setMinYearFilter('');
    setMaxYearFilter('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    startTransition(() => {
      router.push('/inventory');
    });
  };

  const maxPriceSliderValue = Number(maxPrice || maxPriceBound);

  const FilterPanel = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={mobile ? 'space-y-8' : 'space-y-7'}>
      <div className="space-y-3">
        <p className="section-kicker">Find vehicle</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dim" />
          <Input
            placeholder="Search make or model"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="pl-11"
          />
        </div>
      </div>

      {bodyTypes.length > 0 && (
        <div className="space-y-3">
          <p className="section-kicker">Body Style</p>
          <div className="flex flex-wrap gap-2">
            {bodyTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setBodyType(type === bodyType ? '' : type)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  bodyType === type
                    ? 'border-accent/35 bg-accent/12 text-accent'
                    : 'border-white/10 bg-white/[0.03] text-brand-silver hover:border-white/18 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {fuelTypes.length > 0 && (
        <div className="space-y-3">
          <p className="section-kicker">Powertrain</p>
          <div className="grid grid-cols-2 gap-2">
            {fuelTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFuelType(type === fuelType ? '' : type)}
                className={`rounded-2xl border px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  fuelType === type
                    ? 'border-accent/35 bg-accent/12 text-accent'
                    : 'border-white/10 bg-white/[0.03] text-brand-silver hover:border-white/18 hover:text-white'
                }`}
              >
                {type.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <p className="section-kicker">Year Range</p>
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            min={minYear}
            max={maxYear}
            value={minYearFilter}
            onChange={(e) => setMinYearFilter(e.target.value)}
            placeholder={String(minYear)}
          />
          <Input
            type="number"
            min={minYear}
            max={maxYear}
            value={maxYearFilter}
            onChange={(e) => setMaxYearFilter(e.target.value)}
            placeholder={String(maxYear)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="section-kicker">Price Range</p>
          <span className="text-xs uppercase tracking-[0.18em] text-brand-dim">
            Up to ${maxPriceSliderValue.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={minPriceBound}
          max={maxPriceBound}
          step={1000}
          value={maxPriceSliderValue}
          onChange={(e) => setMaxPrice(e.target.value)}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[hsl(var(--accent))]"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={`$${minPriceBound.toLocaleString()}`}
          />
          <Input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={`$${maxPriceBound.toLocaleString()}`}
          />
        </div>
      </div>

      <div className="space-y-3">
        <p className="section-kicker">Sort By</p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="flex h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white transition hover:border-white/18 focus:border-accent/35 focus:outline-none focus:ring-2 focus:ring-accent/35"
        >
          <option value="newest">Newest Arrival</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="accent" size="lg" onClick={applyFilters} disabled={isPending}>
          {isPending ? 'Applying...' : 'Apply Filters'}
        </Button>
        <Button variant="outline" size="lg" onClick={clearFilters} disabled={isPending}>
          Reset
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-6 lg:hidden">
        <ClientOnly
          fallback={(
            <Button variant="outline" size="lg" className="w-full justify-between rounded-2xl" disabled aria-hidden="true">
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Refine Inventory
              </span>
              {activeFilterCount > 0 ? (
                <Badge variant="accent" size="sm">
                  {activeFilterCount}
                </Badge>
              ) : null}
            </Button>
          )}
        >
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="lg" className="w-full justify-between rounded-2xl">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Refine Inventory
                </span>
                {activeFilterCount > 0 ? (
                  <Badge variant="accent" size="sm">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[88vh] overflow-y-auto rounded-t-[2rem]">
              <SheetHeader className="mb-6">
                <SheetTitle>Refine Inventory</SheetTitle>
              </SheetHeader>
              <FilterPanel mobile />
            </SheetContent>
          </Sheet>
        </ClientOnly>
      </div>

      <aside className="hidden lg:block">
        <div className="glass-panel sticky top-28 rounded-[1.75rem] p-6">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="section-kicker">Filters</p>
              <h2 className="font-display text-3xl text-white">Inventory Rail</h2>
            </div>
            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-brand-silver hover:border-white/18 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            ) : (
              <Filter className="h-4 w-4 text-accent/70" />
            )}
          </div>
          <FilterPanel />
        </div>
      </aside>
    </>
  );
}

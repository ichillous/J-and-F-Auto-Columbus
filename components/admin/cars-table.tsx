'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Filter, X, Edit, Car as CarIcon } from 'lucide-react';
import type { Car } from '@/lib/types';

interface CarsTableProps {
  cars: Car[];
  initialSearchParams: Record<string, string | undefined>;
}

export function CarsTable({ cars, initialSearchParams }: CarsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(initialSearchParams.search || '');
  const [statusFilter, setStatusFilter] = useState(initialSearchParams.status || '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    startTransition(() => {
      router.push(`/admin/cars?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    startTransition(() => {
      router.push('/admin/cars');
    });
  };

  const activeFilterCount = [search, statusFilter].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Filters</h2>
            {activeFilterCount > 0 && (
              <Badge variant="accent" size="sm">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                <Search className="h-4 w-4 inline mr-1" />
                Search
              </Label>
              <Input
                id="search"
                placeholder="Search by title, make, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              />
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium mb-2 block">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border-2 border-input bg-transparent px-3 py-2 text-base shadow-sm transition-all duration-200 hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="sold">Sold</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={applyFilters} disabled={isPending} variant="accent">
              {isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Filtering...
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-2" />
                  Apply
                </>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={clearFilters} disabled={isPending}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {cars.length > 0 ? (
        <>
          {/* Mobile: Card View */}
          <div className="space-y-4 lg:hidden">
            {cars.map((car) => (
              <Card key={car.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      {car.hero_image_url ? (
                        <div className="relative w-24 h-24 bg-muted rounded-lg overflow-hidden">
                          <Image
                            src={car.hero_image_url}
                            alt={car.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
                          <CarIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg truncate">{car.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {car.year} {car.make} {car.model}
                          </p>
                        </div>
                        <Badge
                          variant={
                            car.status === 'sold' ? 'destructive' :
                            car.status === 'published' ? 'accent' :
                            'secondary'
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {car.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <p className="text-2xl font-bold text-accent">
                            ${car.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Updated {new Date(car.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Link href={`/admin/cars/${car.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: Table View */}
          <div className="hidden lg:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Image</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Vehicle</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Price</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Updated</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cars.map((car) => (
                      <tr key={car.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          {car.hero_image_url ? (
                            <div className="relative w-20 h-20 bg-muted rounded-lg overflow-hidden">
                              <Image
                                src={car.hero_image_url}
                                alt={car.title}
                                fill
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                              <CarIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-base">{car.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {car.year} {car.make} {car.model}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-accent text-lg">
                            ${car.price.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              car.status === 'sold' ? 'destructive' :
                              car.status === 'published' ? 'accent' :
                              'secondary'
                            }
                            className="capitalize"
                          >
                            {car.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(car.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/admin/cars/${car.id}`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="rounded-full bg-muted p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <CarIcon className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No cars found</h3>
              <p className="text-muted-foreground mb-6">
                {activeFilterCount > 0
                  ? 'Try adjusting your filters or search term'
                  : 'Add your first car to get started'}
              </p>
              {activeFilterCount > 0 ? (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              ) : (
                <Link href="/admin/cars/new">
                  <Button variant="accent">
                    <CarIcon className="h-4 w-4 mr-2" />
                    Add Car
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

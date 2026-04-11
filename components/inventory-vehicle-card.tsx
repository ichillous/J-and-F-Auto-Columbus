import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Calendar, Gauge, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Car } from '@/lib/types';

interface InventoryVehicleCardProps {
  car: Car;
  compact?: boolean;
}

export function InventoryVehicleCard({ car, compact = false }: InventoryVehicleCardProps) {
  const specBits = [
    car.mileage ? { icon: Gauge, label: `${car.mileage.toLocaleString()} mi` } : null,
    car.fuel_type ? { icon: Zap, label: car.fuel_type.replace(/_/g, ' ') } : null,
    { icon: Calendar, label: String(car.year) },
  ].filter(Boolean) as Array<{ icon: typeof Calendar; label: string }>;

  return (
    <Link href={`/cars/${car.slug}`} className="block h-full">
      <Card variant="interactive" className="group h-full rounded-[1.75rem]">
        <div className={compact ? 'relative aspect-[4/4.2]' : 'relative aspect-[4/4.75]'}>
          {car.hero_image_url ? (
            <Image
              src={car.hero_image_url}
              alt={car.title}
              fill
              sizes={compact ? '(max-width: 768px) 100vw, 33vw' : '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw'}
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(111,224,255,0.12),transparent_55%),linear-gradient(180deg,rgba(21,28,39,0.98),rgba(7,10,15,1))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030507] via-[#030507]/15 to-transparent" />
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <Badge variant="secondary" className="bg-black/35 text-white backdrop-blur-md">
              {car.status === 'sold' ? 'Sold' : 'Available'}
            </Badge>
            <div className="rounded-[0.9rem] border border-white/10 bg-black/45 px-3 py-2 text-[0.68rem] font-semibold tracking-[0.16em] text-white">
              ${Math.round(Number(car.price)).toLocaleString()}
            </div>
          </div>
          {car.body_type && (
            <div className="absolute bottom-4 left-4 rounded-full border border-accent/25 bg-accent/12 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-accent">
              {car.body_type}
            </div>
          )}
        </div>
          <CardContent className="space-y-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[0.72rem] uppercase tracking-[0.28em] text-brand-dim">{car.make}</p>
              <h3 className="font-display text-[1.9rem] leading-none text-white">{car.title}</h3>
            </div>
            <span className="pt-1 text-xs font-semibold uppercase tracking-[0.22em] text-accent/80">
              {car.year}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.18em] text-brand-dim">
            {specBits.map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-accent/70" />
                {label}
              </span>
            ))}
          </div>
          <Button variant="ghost" className="px-0 text-[0.66rem] text-accent hover:bg-transparent hover:text-white">
            View Details
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </Link>
  );
}

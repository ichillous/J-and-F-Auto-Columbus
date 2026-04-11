import Link from 'next/link';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';
import { unstable_noStore } from 'next/cache';

import { InventoryVehicleCard } from '@/components/inventory-vehicle-card';
import { PublicShell } from '@/components/public-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  unstable_noStore();
  const supabase = await createClient();

  const { data: settings } = await supabase.from('settings').select('*').maybeSingle();
  const { data: featuredCars } = await supabase
    .from('cars')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(6);

  return (
    <PublicShell currentPath="/">
      <section className="shell-container grid gap-10 py-12 lg:grid-cols-[1.1fr,0.9fr] lg:items-end lg:py-20">
        <div className="space-y-7">
          <Badge variant="secondary" size="lg">
            J&amp;F Auto Collection
          </Badge>
          <div className="space-y-4">
            <p className="section-kicker">Premium Dealership Experience</p>
            <h1 className="page-title text-balance">
              Curated Inventory. Concise Buying. Detail-First Service.
            </h1>
            <p className="page-subtitle">
              {settings?.tagline || 'High-trust inventory presentation, direct inquiries, and dealership operations built around the vehicles you actually have.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="accent" size="xl">
              <Link href="/inventory">View Inventory</Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link href="/contact">Start Inquiry</Link>
            </Button>
          </div>
        </div>

        <Card className="rounded-[2rem]">
          <CardContent className="space-y-6 p-7">
            <div className="flex items-center justify-between border-b border-white/8 pb-4">
              <div>
                <p className="section-kicker">Dealership</p>
                <h2 className="font-display text-3xl text-white">{settings?.dealership_name || 'J&F Auto'}</h2>
              </div>
              <Badge variant="accent">Live Inventory</Badge>
            </div>
            <div className="space-y-4 text-sm text-brand-dim">
              {settings?.phone ? (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-accent/80" />
                  <span>{settings.phone}</span>
                </div>
              ) : null}
              {settings?.email ? (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-accent/80" />
                  <span>{settings.email}</span>
                </div>
              ) : null}
              {settings?.address ? (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-accent/80" />
                  <span>{settings.address}</span>
                </div>
              ) : null}
            </div>
            <p className="text-sm leading-7 text-brand-dim">
              Built around your live dealership data, admin controls, and lead capture flows. The new presentation keeps the same backend and simply elevates the interface.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="shell-container space-y-8 py-4 pb-14 lg:pb-20">
        <div className="flex flex-col gap-3 border-b border-white/8 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-kicker">Featured Inventory</p>
            <h2 className="font-display text-4xl text-white">Current Collection</h2>
          </div>
          <Button asChild variant="ghost" className="px-0 text-accent hover:bg-transparent hover:text-white">
            <Link href="/inventory">
              Browse Full Inventory
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {featuredCars && featuredCars.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredCars.map((car) => (
              <InventoryVehicleCard key={car.id} car={car} compact />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
              <h3 className="font-display text-4xl text-white">Inventory Will Appear Here</h3>
              <p className="max-w-lg text-sm leading-7 text-brand-dim">
                Once real vehicles are published from the admin panel, they will inherit the same premium presentation across the homepage and inventory pages.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </PublicShell>
  );
}

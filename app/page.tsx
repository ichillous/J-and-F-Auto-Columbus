import Link from 'next/link';
import { ArrowRight, Mail, MapPin, Phone } from 'lucide-react';

import { InventoryVehicleCard } from '@/components/inventory-vehicle-card';
import { PublicShell } from '@/components/public-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSettings, listPublishedCars } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [settings, allPublished] = await Promise.all([getSettings(), listPublishedCars()]);
  const featuredCars = allPublished
    .slice()
    .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
    .slice(0, 6);
  const liveInventoryCount = allPublished.length;

  return (
    <PublicShell currentPath="/" settings={settings}>
      <section className="shell-container grid gap-10 py-12 lg:grid-cols-[1.1fr,0.9fr] lg:items-end lg:py-20">
        <div className="space-y-7">
          <Badge variant="secondary" size="lg">
            J&amp;F Auto Collection
          </Badge>
          <div className="space-y-4">
            <p className="section-kicker">Columbus Private-Client Inventory</p>
            <h1 className="page-title text-balance">
              Curated Inventory. Precise Guidance. Direct Purchase Flow.
            </h1>
            <p className="page-subtitle">
              {settings?.tagline || 'A focused dealership experience for buyers who want clarity, responsive communication, and inventory presented without noise.'}
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
          <div className="grid gap-3 pt-2 sm:grid-cols-3">
            <div className="glass-panel rounded-[1.35rem] px-4 py-4">
              <p className="section-kicker">Live Inventory</p>
              <p className="mt-2 font-display text-3xl text-white">{liveInventoryCount}</p>
            </div>
            <div className="glass-panel rounded-[1.35rem] px-4 py-4">
              <p className="section-kicker">Response Style</p>
              <p className="mt-2 text-sm uppercase tracking-[0.18em] text-white">Direct &amp; Detailed</p>
            </div>
            <div className="glass-panel rounded-[1.35rem] px-4 py-4">
              <p className="section-kicker">Location</p>
              <p className="mt-2 text-sm uppercase tracking-[0.18em] text-white">Columbus, Ohio</p>
            </div>
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
              A concise inventory presentation, clear outreach path, and dealership details kept ready for buyers who prefer an informed first conversation.
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

        {featuredCars.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredCars.map((car) => (
              <InventoryVehicleCard key={car.id} car={car} compact />
            ))}
          </div>
        ) : (
          <Card className="rounded-[2rem]">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-5 text-center">
              <div className="rounded-full border border-accent/15 bg-accent/8 px-4 py-2 text-[0.66rem] font-semibold uppercase tracking-[0.28em] text-accent">
                Collection Status
              </div>
              <h3 className="font-display text-4xl text-white">Current Collection Preparing For Release</h3>
              <p className="max-w-xl text-sm leading-7 text-brand-dim">
                Published vehicles will appear here automatically as they are released into the live inventory.
              </p>
              <Button asChild variant="outline" size="lg">
                <Link href="/contact">Request Inventory Assistance</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>
    </PublicShell>
  );
}

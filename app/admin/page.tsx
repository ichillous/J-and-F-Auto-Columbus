import Link from 'next/link';
import { ArrowRight, Car, CheckCircle, Eye, Mail, Plus, TrendingUp } from 'lucide-react';

import { requireRole } from '@/lib/auth';
import { listAllCars, listLeads } from '@/lib/data';

import { AdminPageHeader } from '@/components/admin-page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function AdminDashboard() {
  await requireRole(['admin', 'staff', 'readonly']);

  const [cars, leads] = await Promise.all([listAllCars(), listLeads()]);

  const totalCars = cars.length;
  const publishedCars = cars.filter((c) => c.status === 'published').length;
  const soldCars = cars.filter((c) => c.status === 'sold').length;
  const newLeads = leads.filter((l) => l.status === 'new').length;

  const recentLeads = leads.slice(0, 5);
  const recentCars = [...cars]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Dashboard"
        description="A premium view over the same live inventory, leads, and dealership operations data."
        icon={<TrendingUp className="h-8 w-8 text-accent" />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total Cars', value: totalCars, icon: Car },
          { label: 'Published', value: publishedCars, icon: Eye },
          { label: 'Sold Cars', value: soldCars, icon: CheckCircle },
          { label: 'New Leads', value: newLeads, icon: Mail },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="section-kicker">{label}</p>
                <p className="font-display text-5xl text-white">{value}</p>
              </div>
              <div className="rounded-full border border-accent/20 bg-accent/10 p-3">
                <Icon className="h-6 w-6 text-accent" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/admin/cars/new">
                <Plus className="h-4 w-4" />
                Add Car
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/admin/cars">
                <Car className="h-4 w-4" />
                View Inventory
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/admin/leads">
                <Mail className="h-4 w-4" />
                View Leads
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-accent" />
              Recent Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 transition hover:border-accent/20 hover:bg-white/[0.05]"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-white">{lead.name}</p>
                    <p className="text-sm text-brand-dim">{lead.email}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" size="sm" className="capitalize">
                        {lead.type.replace('_', ' ')}
                      </Badge>
                      <Badge variant={lead.status === 'new' ? 'accent' : 'secondary'} size="sm" className="capitalize">
                        {lead.status}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-brand-dim">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-brand-dim">No leads yet.</p>
            )}
            <Button asChild variant="ghost" className="px-0 text-accent hover:bg-transparent hover:text-white">
              <Link href="/admin/leads">
                View All Leads
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5 text-accent" />
              Recently Updated Cars
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentCars.length > 0 ? (
              recentCars.map((car) => (
                <Link
                  key={car.id}
                  href={`/admin/cars/${car.id}`}
                  className="flex items-start justify-between gap-3 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4 transition hover:border-accent/20 hover:bg-white/[0.05]"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-white">{car.title}</p>
                    <p className="text-sm text-accent">${Number(car.price).toLocaleString()}</p>
                    <Badge
                      variant={car.status === 'published' ? 'accent' : car.status === 'sold' ? 'success' : 'secondary'}
                      size="sm"
                      className="capitalize"
                    >
                      {car.status}
                    </Badge>
                  </div>
                  <span className="text-xs uppercase tracking-[0.18em] text-brand-dim">
                    {new Date(car.updated_at).toLocaleDateString()}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-brand-dim">No cars yet.</p>
            )}
            <Button asChild variant="ghost" className="px-0 text-accent hover:bg-transparent hover:text-white">
              <Link href="/admin/cars">
                Manage Cars
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

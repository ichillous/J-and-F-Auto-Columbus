import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Mail } from 'lucide-react';

import { requireRole } from '@/lib/auth';
import { getCarById, getLeadById } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LeadStatusUpdate } from '@/components/admin/lead-status-update';
import { AdminPageHeader } from '@/components/admin-page-header';

export const dynamic = 'force-dynamic';

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(['admin', 'staff', 'readonly']);
  const { id } = await params;

  const lead = await getLeadById(id);
  if (!lead) notFound();

  const car = lead.car_id ? await getCarById(lead.car_id) : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Lead Details"
        description="Review contact data, linked vehicle context, and keep the lead status current."
        icon={<Mail className="h-8 w-8 text-accent" />}
        backHref="/admin/leads"
        backLabel="Back to Leads"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-brand-dim">Name</p>
              <p className="font-medium">{lead.name}</p>
            </div>
            <div>
              <p className="text-sm text-brand-dim">Email</p>
              <a href={`mailto:${lead.email}`} className="text-accent hover:underline">
                {lead.email}
              </a>
            </div>
            {lead.phone && (
              <div>
                <p className="text-sm text-brand-dim">Phone</p>
                <a href={`tel:${lead.phone}`} className="text-accent hover:underline">
                  {lead.phone}
                </a>
              </div>
            )}
            <div>
              <p className="text-sm text-brand-dim">Type</p>
              <Badge variant="outline">{lead.type.replace('_', ' ')}</Badge>
            </div>
            <div>
              <p className="text-sm text-brand-dim">Status</p>
              <LeadStatusUpdate leadId={lead.id} currentStatus={lead.status} />
            </div>
            <div>
              <p className="text-sm text-brand-dim">Submitted</p>
              <p>{new Date(lead.created_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {car && (
          <Card>
            <CardHeader>
              <CardTitle>Car Information</CardTitle>
            </CardHeader>
            <CardContent>
              <Link href={`/cars/${car.slug}`} className="font-medium text-accent hover:underline">
                {car.title}
              </Link>
              <div className="mt-4 space-y-2 text-sm">
                <p>
                  <span className="text-brand-dim">Price: </span>
                  <span className="font-medium">${car.price.toLocaleString()}</span>
                </p>
                <p>
                  <span className="text-brand-dim">Year: </span>
                  {car.year}
                </p>
                {car.mileage !== null && (
                  <p>
                    <span className="text-brand-dim">Mileage: </span>
                    {car.mileage.toLocaleString()} miles
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {lead.message && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Message</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{lead.message}</p>
            </CardContent>
          </Card>
        )}

        {lead.preferred_datetime && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Preferred Date & Time</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{new Date(lead.preferred_datetime).toLocaleString()}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

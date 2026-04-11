import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { unstable_noStore } from 'next/cache';

import { LeadFormModal } from '@/components/lead-form-modal';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export default async function ContactPage() {
  unstable_noStore();
  const supabase = await createClient();
  const { data: settings } = await supabase.from('settings').select('*').maybeSingle();
  const hours = (settings?.hours_json ?? {}) as Record<string, string>;

  return (
    <PublicShell currentPath="/contact">
      <div className="shell-container space-y-10 py-12 lg:space-y-14 lg:py-16">
        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
          <div className="space-y-4">
            <p className="section-kicker">Contact</p>
            <h1 className="page-title">Direct Inquiry, Clear Response.</h1>
            <p className="page-subtitle">
              Reach the dealership directly, review business hours, or send an inquiry for the vehicle or purchase conversation you want to start.
            </p>
          </div>
          <Card>
            <CardContent className="space-y-4 p-7">
              <div className="border-b border-white/8 pb-4">
                <p className="section-kicker">Dealership Desk</p>
                <h2 className="font-display text-3xl text-white">{settings?.dealership_name || 'J&F Auto'}</h2>
              </div>
              {settings?.phone ? (
                <div className="flex items-center gap-3 text-sm text-brand-dim">
                  <Phone className="h-4 w-4 text-accent/80" />
                  <span>{settings.phone}</span>
                </div>
              ) : null}
              {settings?.email ? (
                <div className="flex items-center gap-3 text-sm text-brand-dim">
                  <Mail className="h-4 w-4 text-accent/80" />
                  <span>{settings.email}</span>
                </div>
              ) : null}
              {settings?.address ? (
                <div className="flex items-center gap-3 text-sm text-brand-dim">
                  <MapPin className="h-4 w-4 text-accent/80" />
                  <span>{settings.address}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr,1.1fr]">
          <Card>
            <CardContent className="space-y-6 p-7">
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-accent/20 bg-accent/10 p-3">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="section-kicker">Hours</p>
                  <h2 className="font-display text-3xl text-white">Business Schedule</h2>
                </div>
              </div>
              <div className="space-y-3">
                {DAYS.map((day) => (
                  <div key={day} className="flex items-center justify-between border-b border-white/8 pb-3 text-sm last:border-b-0 last:pb-0">
                    <span className="font-semibold uppercase tracking-[0.18em] text-brand-silver">{day}</span>
                    <span className="text-brand-dim">{hours[day] || 'Closed'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-6 p-7">
              <div className="space-y-3">
                <p className="section-kicker">Lead Capture</p>
                <h2 className="font-display text-4xl text-white">Open The Inquiry Form</h2>
                <p className="text-sm leading-7 text-brand-dim">
                  Send a direct request for inventory questions, appointment planning, or a first conversation with the dealership team.
                </p>
              </div>

              <LeadFormModal type="general">
                <Button variant="accent" size="xl" className="w-full sm:w-auto">
                  Send Contact Request
                </Button>
              </LeadFormModal>

              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-brand-dim">
                Prefer a direct conversation? Use the dealership details here or send the form and wait for a follow-up from the team.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </PublicShell>
  );
}

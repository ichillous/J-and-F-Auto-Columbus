import { Clock, Mail, MapPin, Phone } from 'lucide-react';

import { LeadFormModal } from '@/components/lead-form-modal';
import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSettings } from '@/lib/data';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const settings = await getSettings();
  const hours = (settings?.hours_json ?? {}) as Record<string, string>;

  return (
    <PublicShell currentPath="/contact" settings={settings}>
      <div className="shell-container space-y-10 py-12 lg:space-y-14 lg:py-16">
        <section className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr] lg:items-end">
          <div className="space-y-4">
            <p className="section-kicker">Contact</p>
            <h1 className="page-title">Get in touch.</h1>
            <p className="page-subtitle">
              Call, email, or send a message &mdash; whichever&rsquo;s easier.
            </p>
          </div>
          <Card>
            <CardContent className="space-y-4 p-7">
              <div className="border-b border-white/8 pb-4">
                <p className="section-kicker">Visit</p>
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
                  <p className="section-kicker">Open</p>
                  <h2 className="font-display text-3xl text-white">Hours</h2>
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
                <p className="section-kicker">Message</p>
                <h2 className="font-display text-4xl text-white">Send a note</h2>
                <p className="text-sm leading-7 text-brand-dim">
                  Questions about a specific car, or want to set up a visit? Drop us a line.
                </p>
              </div>

              <LeadFormModal type="general">
                <Button variant="accent" size="xl" className="w-full sm:w-auto">
                  Send Message
                </Button>
              </LeadFormModal>

              <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5 text-sm leading-7 text-brand-dim">
                We usually respond same-day during business hours.
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </PublicShell>
  );
}

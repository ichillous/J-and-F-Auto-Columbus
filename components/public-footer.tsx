import Link from 'next/link';

import { Logo } from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import type { Settings } from '@/lib/types';

interface PublicFooterProps {
  settings: Settings | null;
}

export function PublicFooter({ settings }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-white/8 bg-[linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.42))]">
      <div className="shell-container grid gap-10 py-12 lg:grid-cols-[1.1fr,0.8fr,0.9fr]">
        <div className="space-y-5">
          <Logo size="lg" />
          <p className="max-w-md text-sm leading-7 text-brand-dim">
            {settings?.tagline || 'A refined dealership experience built around vetted inventory, clear communication, and private-client attention.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Inventory Ready</Badge>
            <Badge variant="secondary">Concierge Inquiry</Badge>
            <Badge variant="secondary">Columbus, Ohio</Badge>
          </div>
        </div>

        <div className="space-y-3">
          <p className="section-kicker">Navigate</p>
          <div className="flex flex-col gap-2 text-sm text-brand-dim">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/inventory" className="hover:text-white">Inventory</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>

        <div className="space-y-3">
          <p className="section-kicker">Contact Desk</p>
          <div className="space-y-2 text-sm text-brand-dim">
            {settings?.phone && <p>{settings.phone}</p>}
            {settings?.email && <p>{settings.email}</p>}
            {settings?.address && <p>{settings.address}</p>}
          </div>
        </div>
      </div>
      <div className="shell-container flex flex-col gap-2 border-t border-white/8 py-4 text-[0.68rem] uppercase tracking-[0.2em] text-brand-dim sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {currentYear} J&amp;F Auto</p>
        <p>Current inventory and inquiry availability subject to live dealership updates.</p>
      </div>
    </footer>
  );
}

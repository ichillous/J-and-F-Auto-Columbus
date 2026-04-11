import Link from 'next/link';

import { Logo } from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import type { Settings } from '@/lib/types';

interface PublicFooterProps {
  settings: Settings | null;
}

export function PublicFooter({ settings }: PublicFooterProps) {
  return (
    <footer className="border-t border-white/8 bg-black/30">
      <div className="shell-container grid gap-10 py-10 lg:grid-cols-[1.2fr,0.8fr,0.8fr]">
        <div className="space-y-4">
          <Logo size="lg" />
          <p className="max-w-md text-sm leading-7 text-brand-dim">
            {settings?.tagline || 'Premium inventory, transparent guidance, and concierge-level dealership service.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Premium Selection</Badge>
            <Badge variant="secondary">Detail-Led Buying</Badge>
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
          <p className="section-kicker">Contact</p>
          <div className="space-y-2 text-sm text-brand-dim">
            {settings?.phone && <p>{settings.phone}</p>}
            {settings?.email && <p>{settings.email}</p>}
            {settings?.address && <p>{settings.address}</p>}
          </div>
        </div>
      </div>
    </footer>
  );
}

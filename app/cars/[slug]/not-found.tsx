import Link from 'next/link';

import { PublicShell } from '@/components/public-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSettings } from '@/lib/data';

export default async function CarNotFoundPage() {
  const settings = await getSettings();
  return (
    <PublicShell currentPath="/inventory" settings={settings}>
      <div className="shell-container py-20">
        <Card>
          <CardContent className="flex min-h-[360px] flex-col items-center justify-center gap-5 text-center">
            <p className="section-kicker">Inventory</p>
            <h1 className="font-display text-5xl text-white">Vehicle Not Found</h1>
            <p className="max-w-lg text-sm leading-7 text-brand-dim">
              The requested vehicle is no longer available or the link is no longer valid in the live inventory.
            </p>
            <Button asChild variant="accent" size="lg">
              <Link href="/inventory">Return to Inventory</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}

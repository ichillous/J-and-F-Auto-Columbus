import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  icon,
  backHref,
  backLabel = 'Back',
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {backHref ? (
          <Button asChild variant="ghost" className="px-0 text-brand-silver hover:bg-transparent hover:text-white">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        ) : null}
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <p className="section-kicker">Admin</p>
            <h1 className="font-display text-4xl text-white">{title}</h1>
          </div>
        </div>
        {description ? <p className="max-w-2xl text-sm leading-7 text-brand-dim">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

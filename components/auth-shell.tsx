import type { ReactNode } from 'react';
import Link from 'next/link';

import { Logo } from '@/components/logo';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
      <div className="shell-container grid gap-8 lg:grid-cols-[0.92fr,1.08fr] lg:items-stretch">
        <aside className="glass-panel hidden min-h-[620px] rounded-[2rem] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-8">
            <Link href="/" className="inline-flex">
              <Logo size="xl" />
            </Link>
            <div className="space-y-5">
              <p className="section-kicker">{eyebrow}</p>
              <h1 className="font-display text-6xl leading-[0.92] text-white">{title}</h1>
              <p className="max-w-md text-base leading-7 text-brand-dim">{description}</p>
            </div>
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-brand-dim">
            Secure access for J&amp;F Auto operations and customer communications.
          </p>
        </aside>
        <div className="mx-auto flex w-full max-w-xl items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}

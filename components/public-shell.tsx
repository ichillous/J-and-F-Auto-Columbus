import type { ReactNode } from 'react';

import type { Settings } from '@/lib/types';

import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';

interface PublicShellProps {
  currentPath?: string;
  settings: Settings | null;
  children: ReactNode;
}

export function PublicShell({ currentPath, settings, children }: PublicShellProps) {
  return (
    <div className="page-shell">
      <PublicHeader currentPath={currentPath} />
      <main className="relative z-10">{children}</main>
      <PublicFooter settings={settings} />
    </div>
  );
}

import type { ReactNode } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Settings } from '@/lib/types';

import { PublicFooter } from '@/components/public-footer';
import { PublicHeader } from '@/components/public-header';

interface PublicShellProps {
  currentPath?: string;
  children: ReactNode;
}

export async function PublicShell({ currentPath, children }: PublicShellProps) {
  const supabase = await createClient();
  const { data: settings } = await supabase.from('settings').select('*').maybeSingle<Settings>();

  return (
    <div className="page-shell">
      <PublicHeader currentPath={currentPath} />
      <main className="relative z-10">{children}</main>
      <PublicFooter settings={settings ?? null} />
    </div>
  );
}

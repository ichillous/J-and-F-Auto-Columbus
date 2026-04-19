'use client';

import { useTransition } from 'react';

import { logoutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={() => {
        startTransition(() => {
          logoutAction();
        });
      }}
    >
      <Button type="submit" variant="outline" disabled={isPending}>
        {isPending ? 'Signing out...' : 'Logout'}
      </Button>
    </form>
  );
}

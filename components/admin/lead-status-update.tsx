'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { updateLeadStatusAction } from '@/lib/actions/leads';
import type { Lead } from '@/lib/types';

interface Props {
  leadId: string;
  currentStatus: Lead['status'];
}

export function LeadStatusUpdate({ leadId, currentStatus }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="flex h-10 rounded-md border-2 border-input bg-transparent px-3 text-sm shadow-sm transition hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
      value={currentStatus}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as Lead['status'];
        startTransition(async () => {
          await updateLeadStatusAction(leadId, next);
          router.refresh();
        });
      }}
    >
      <option value="new">New</option>
      <option value="in_progress">In Progress</option>
      <option value="closed">Closed</option>
    </select>
  );
}

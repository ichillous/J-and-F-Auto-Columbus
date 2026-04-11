'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface LeadStatusUpdateProps {
  leadId: string;
  currentStatus: string;
}

export function LeadStatusUpdate({
  leadId,
  currentStatus,
}: LeadStatusUpdateProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', leadId);

      if (error) throw error;
      setStatus(newStatus);
      router.refresh();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <select
      className="text-sm rounded border px-2 py-1"
      value={status}
      onChange={(e) => handleStatusChange(e.target.value)}
      disabled={isUpdating}
    >
      <option value="new">New</option>
      <option value="in_progress">In Progress</option>
      <option value="closed">Closed</option>
    </select>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Filter, X, Eye, Mail, Phone, Car as CarIcon } from 'lucide-react';

import { updateLeadStatusAction } from '@/lib/actions/leads';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { Lead } from '@/lib/types';

export interface LeadWithCar extends Lead {
  car?: { title: string; slug: string } | null;
}

interface LeadsTableProps {
  leads: LeadWithCar[];
  initialSearchParams: Record<string, string | undefined>;
}

export function LeadsTable({ leads, initialSearchParams }: LeadsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [typeFilter, setTypeFilter] = useState(initialSearchParams.type || '');
  const [statusFilter, setStatusFilter] = useState(initialSearchParams.status || '');
  const [fromDate, setFromDate] = useState(initialSearchParams.fromDate || '');
  const [toDate, setToDate] = useState(initialSearchParams.toDate || '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (fromDate) params.set('fromDate', fromDate);
    if (toDate) params.set('toDate', toDate);
    startTransition(() => {
      router.push(`/admin/leads?${params.toString()}`);
    });
  };

  const clearFilters = () => {
    setTypeFilter('');
    setStatusFilter('');
    setFromDate('');
    setToDate('');
    startTransition(() => {
      router.push('/admin/leads');
    });
  };

  const updateStatus = (leadId: string, newStatus: Lead['status']) => {
    startTransition(async () => {
      await updateLeadStatusAction(leadId, newStatus);
      router.refresh();
    });
  };

  const activeFilterCount = [typeFilter, statusFilter, fromDate, toDate].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Filters</h2>
            {activeFilterCount > 0 && (
              <Badge variant="accent" size="sm">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="type" className="text-sm font-medium mb-2 block">Type</Label>
              <select
                id="type"
                className="flex h-10 w-full rounded-md border-2 border-input bg-transparent px-3 py-2 text-base shadow-sm transition-all duration-200 hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="">All Types</option>
                <option value="request_info">Request Info</option>
                <option value="test_drive">Test Drive</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <Label htmlFor="status-filter" className="text-sm font-medium mb-2 block">Status</Label>
              <select
                id="status-filter"
                className="flex h-10 w-full rounded-md border-2 border-input bg-transparent px-3 py-2 text-base shadow-sm transition-all duration-200 hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <Label htmlFor="fromDate" className="text-sm font-medium mb-2 block">From Date</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="toDate" className="text-sm font-medium mb-2 block">To Date</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={applyFilters} disabled={isPending} variant="accent">
              {isPending ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Filtering...
                </>
              ) : (
                <>
                  <Filter className="h-4 w-4 mr-2" />
                  Apply
                </>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button variant="outline" onClick={clearFilters} disabled={isPending}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {leads.length > 0 ? (
        <>
          <div className="space-y-4 lg:hidden">
            {leads.map((lead) => (
              <Card key={lead.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{lead.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="secondary" size="sm" className="capitalize">
                            {lead.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant={lead.status === 'new' ? 'accent' : 'secondary'} size="sm" className="capitalize">
                            {lead.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 flex-shrink-0" />
                        <span className="break-all">{lead.email}</span>
                      </div>
                      {lead.phone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.car && (
                        <div className="flex items-center gap-2">
                          <CarIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          <Link href={`/cars/${lead.car.slug}`} className="text-accent hover:underline">
                            {lead.car.title}
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <select
                        className="flex h-9 rounded-md border-2 border-input bg-transparent px-3 text-sm shadow-sm transition-all duration-200 hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value as Lead['status'])}
                        disabled={isPending}
                      >
                        <option value="new">New</option>
                        <option value="in_progress">In Progress</option>
                        <option value="closed">Closed</option>
                      </select>
                      <Link href={`/admin/leads/${lead.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden lg:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b-2">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Date</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Contact</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Type</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Car</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold">{lead.name}</p>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{lead.email}</span>
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">{lead.phone}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="capitalize">
                            {lead.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          {lead.car ? (
                            <Link href={`/cars/${lead.car.slug}`} className="text-accent hover:underline text-sm font-medium">
                              {lead.car.title}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            className="flex h-9 rounded-md border-2 border-input bg-transparent px-3 text-sm shadow-sm transition-all duration-200 hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
                            value={lead.status}
                            onChange={(e) => updateStatus(lead.id, e.target.value as Lead['status'])}
                            disabled={isPending}
                          >
                            <option value="new">New</option>
                            <option value="in_progress">In Progress</option>
                            <option value="closed">Closed</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <Link href={`/admin/leads/${lead.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="rounded-full bg-muted p-6 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Mail className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No leads found</h3>
              <p className="text-muted-foreground mb-6">
                {activeFilterCount > 0
                  ? 'Try adjusting your filters or date range'
                  : 'New leads will appear here when customers reach out'}
              </p>
              {activeFilterCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

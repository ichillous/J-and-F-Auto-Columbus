'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LeadFormModalProps {
  carId?: string;
  carTitle?: string;
  type: 'request_info' | 'test_drive' | 'general';
  children: React.ReactNode;
}

export function LeadFormModal({
  carId,
  carTitle,
  type,
  children,
}: LeadFormModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
    preferred_datetime: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase.from('leads').insert({
        car_id: carId || null,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        type,
        message: formData.message || null,
        preferred_datetime: formData.preferred_datetime || null,
        status: 'new',
        source_page: carId ? 'car_detail' : 'contact',
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: '',
          preferred_datetime: '',
        });
        router.refresh();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === 'test_drive'
    ? 'Schedule Test Drive'
    : type === 'request_info'
      ? 'Request More Info'
      : 'Contact J&F Auto';

  return (
    <>
      <div className="cursor-pointer" onClick={() => setIsOpen(true)}>
        {children}
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#020406]/78 px-4 py-6 backdrop-blur-md"
          onClick={() => setIsOpen(false)}
        >
          <Card className="w-full max-w-xl rounded-[1.75rem]" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="relative border-b border-white/8 pb-5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute right-6 top-6 rounded-full border border-white/10 bg-white/[0.04] p-2 text-brand-silver hover:border-white/18 hover:text-white"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
              <CardTitle>{title}</CardTitle>
              {carTitle ? <CardDescription>Vehicle: {carTitle}</CardDescription> : null}
            </CardHeader>
            <CardContent className="pt-6">
              {success ? (
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-display text-3xl text-white">Inquiry Sent</p>
                    <p className="text-sm leading-7 text-brand-dim">
                      Your lead was submitted to the live CRM flow successfully.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  {type === 'test_drive' ? (
                    <div className="space-y-2">
                      <Label htmlFor="preferred_datetime">Preferred Date &amp; Time</Label>
                      <Input
                        id="preferred_datetime"
                        type="datetime-local"
                        value={formData.preferred_datetime}
                        onChange={(e) => setFormData({ ...formData, preferred_datetime: e.target.value })}
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  {error ? (
                    <div className="rounded-[1.25rem] border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                      <span className="inline-flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </span>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <Button type="button" variant="outline" size="lg" className="sm:flex-1" onClick={() => setIsOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="accent" size="lg" className="sm:flex-1" disabled={isSubmitting}>
                      {isSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}

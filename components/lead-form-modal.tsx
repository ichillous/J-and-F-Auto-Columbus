'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { submitLeadAction } from '@/lib/actions/leads';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface LeadFormModalProps {
  carId?: string;
  carTitle?: string;
  type: 'request_info' | 'test_drive' | 'general';
  children: React.ReactNode;
}

export function LeadFormModal({ carId, carTitle, type, children }: LeadFormModalProps) {
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
      await submitLeadAction({
        car_id: carId ?? null,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        message: formData.message || undefined,
        preferred_datetime: formData.preferred_datetime || undefined,
        type,
        source_page: carId ? 'car_detail' : 'contact',
      });

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        setFormData({ name: '', email: '', phone: '', message: '', preferred_datetime: '' });
        router.refresh();
      }, 1800);
    } catch (err) {
      console.error('submitLeadAction failure', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === 'test_drive'
    ? 'Schedule a Test Drive'
    : type === 'request_info'
      ? 'Ask About This Car'
      : 'Send a Message';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <Card className="rounded-[1.75rem]">
          <CardHeader className="border-b border-white/8 pb-5">
            <DialogTitle asChild>
              <CardTitle>{title}</CardTitle>
            </DialogTitle>
            {carTitle ? (
              <DialogDescription asChild>
                <CardDescription>Vehicle: {carTitle}</CardDescription>
              </DialogDescription>
            ) : null}
          </CardHeader>
          <CardContent className="pt-6">
            {success ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                </div>
                <div className="space-y-2">
                  <p className="font-display text-3xl text-white">Message sent.</p>
                  <p className="text-sm leading-7 text-brand-dim">
                    We&rsquo;ll be in touch soon.
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
                    maxLength={2000}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="sm:flex-1"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="accent" size="lg" className="sm:flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

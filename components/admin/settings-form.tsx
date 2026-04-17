'use client';

import { useState, useTransition } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
  Palette,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import { saveSettingsAction } from '@/lib/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Settings } from '@/lib/types';

interface SettingsFormProps {
  settings: Settings | null;
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type Day = (typeof DAYS)[number];

export function SettingsForm({ settings }: SettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initialHours = (settings?.hours_json ?? {}) as Record<string, string>;
  const [formData, setFormData] = useState({
    dealership_name: settings?.dealership_name ?? '',
    logo_url: settings?.logo_url ?? '',
    primary_color: settings?.primary_color ?? '#000000',
    secondary_color: settings?.secondary_color ?? '#666666',
    tagline: settings?.tagline ?? '',
    phone: settings?.phone ?? '',
    email: settings?.email ?? '',
    address: settings?.address ?? '',
    about_text: settings?.about_text ?? '',
    hours: DAYS.reduce(
      (acc, day) => ({ ...acc, [day]: initialHours[day] ?? '' }),
      {} as Record<Day, string>,
    ),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await saveSettingsAction({
          dealership_name: formData.dealership_name,
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          tagline: formData.tagline || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          about_text: formData.about_text || null,
          hours_json: formData.hours,
        });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="dealership_name">Dealership Name *</Label>
            <Input
              id="dealership_name"
              required
              value={formData.dealership_name}
              onChange={(e) => setFormData({ ...formData, dealership_name: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="logo_url">Logo URL</Label>
            <Input
              id="logo_url"
              type="url"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_color" className="flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Primary Color
              </Label>
              <Input
                id="primary_color"
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="secondary_color" className="flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Secondary Color
              </Label>
              <Input
                id="secondary_color"
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-accent" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="address" className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Address
            </Label>
            <Textarea
              id="address"
              className="min-h-[80px]"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-accent" />
            Business Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {DAYS.map((day) => (
              <div key={day}>
                <Label htmlFor={`hours_${day}`} className="capitalize">{day}</Label>
                <Input
                  id={`hours_${day}`}
                  placeholder="e.g., 9 AM - 6 PM or Closed"
                  value={formData.hours[day]}
                  onChange={(e) =>
                    setFormData({ ...formData, hours: { ...formData.hours, [day]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            About Text
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            id="about_text"
            className="min-h-[200px]"
            placeholder="Tell customers about your dealership..."
            value={formData.about_text}
            onChange={(e) => setFormData({ ...formData, about_text: e.target.value })}
          />
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="font-medium">Settings saved successfully!</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isPending} variant="accent" size="lg">
          {isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </Button>
      </div>
    </form>
  );
}

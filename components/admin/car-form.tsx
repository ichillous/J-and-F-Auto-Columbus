'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

import { saveCarAction } from '@/lib/actions/cars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUpload } from '@/components/admin/image-upload';
import type { Car } from '@/lib/types';

interface CarFormProps {
  car?: Car;
}

export function CarForm({ car }: CarFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: car?.title ?? '',
    slug: car?.slug ?? '',
    year: car?.year?.toString() ?? '',
    make: car?.make ?? '',
    model: car?.model ?? '',
    trim: car?.trim ?? '',
    mileage: car?.mileage?.toString() ?? '',
    price: car?.price?.toString() ?? '',
    body_type: car?.body_type ?? '',
    transmission: car?.transmission ?? '',
    fuel_type: car?.fuel_type ?? '',
    status: car?.status ?? 'published',
    hero_image_url: car?.hero_image_url ?? '',
    gallery: car?.gallery ?? [],
    description: car?.description ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const galleryArray = Array.isArray(formData.gallery)
          ? formData.gallery.filter(Boolean)
          : [];

        await saveCarAction({
          id: car?.id,
          title: formData.title,
          slug: formData.slug,
          year: parseInt(formData.year, 10),
          make: formData.make,
          model: formData.model,
          trim: formData.trim || null,
          mileage: formData.mileage ? parseInt(formData.mileage, 10) : null,
          price: parseFloat(formData.price),
          body_type: formData.body_type || null,
          transmission: formData.transmission || null,
          fuel_type: formData.fuel_type || null,
          status: formData.status as Car['status'],
          hero_image_url: formData.hero_image_url || null,
          gallery: galleryArray.length > 0 ? galleryArray : null,
          description: formData.description || null,
        });

        router.push('/admin/cars');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                required
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                required
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                required
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="trim">Trim</Label>
              <Input
                id="trim"
                value={formData.trim}
                onChange={(e) => setFormData({ ...formData, trim: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mileage">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                value={formData.mileage}
                onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="body_type">Body Type</Label>
              <Input
                id="body_type"
                value={formData.body_type}
                onChange={(e) => setFormData({ ...formData, body_type: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="transmission">Transmission</Label>
              <Input
                id="transmission"
                value={formData.transmission}
                onChange={(e) => setFormData({ ...formData, transmission: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="fuel_type">Fuel Type</Label>
              <Input
                id="fuel_type"
                value={formData.fuel_type}
                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="leave blank to auto-generate"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <select
              id="status"
              className="flex h-10 w-full rounded-md border-2 border-input bg-transparent px-3 py-2 text-base shadow-sm transition hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Car['status'] })}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <ImageUpload
            label="Hero Image"
            value={formData.hero_image_url}
            onChange={(url) => setFormData({ ...formData, hero_image_url: url as string })}
            multiple={false}
            carId={car?.id}
          />

          <ImageUpload
            label="Gallery Images"
            value={formData.gallery}
            onChange={(urls) => setFormData({ ...formData, gallery: urls as string[] })}
            multiple={true}
            carId={car?.id}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            id="description"
            className="flex min-h-[200px] w-full rounded-md border-2 border-input bg-transparent px-3 py-2 text-sm shadow-sm transition hover:border-accent/50 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/20"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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

      <div className="flex gap-4">
        <Button type="submit" disabled={isPending} variant="accent" size="lg">
          {isPending ? 'Saving...' : car ? 'Update Car' : 'Create Car'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push('/admin/cars')}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

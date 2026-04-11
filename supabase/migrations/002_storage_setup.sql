-- Create storage bucket for car images
INSERT INTO storage.buckets (id, name, public)
VALUES ('jfautocars', 'jfautocars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies for jfautocars bucket

-- Allow public to read files (this allows images to load)
CREATE POLICY "Public can read car images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'jfautocars');

-- Allow authenticated users with admin/staff roles to upload
CREATE POLICY "Admins and staff can upload car images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'jfautocars'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Allow authenticated users with admin/staff roles to update
CREATE POLICY "Admins and staff can update car images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'jfautocars'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

-- Allow authenticated users with admin/staff roles to delete
CREATE POLICY "Admins and staff can delete car images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'jfautocars'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'staff')
    )
  );

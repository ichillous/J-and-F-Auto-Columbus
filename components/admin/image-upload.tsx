'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { X, Upload, Loader2 } from 'lucide-react';

interface ImageUploadProps {
  value: string | string[] | null; // Single URL or array of URLs
  onChange: (urls: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  carId?: string; // For organizing uploads in storage
}

export function ImageUpload({
  value,
  onChange,
  multiple = false,
  label,
  carId,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const currentUrls: string[] = (() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  })();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      const replaceUrl = fileInputRef.current?.dataset.replaceUrl;
      const filesToProcess = Array.from(files);
      
      const uploadPromises = filesToProcess.map(async (file) => {
        // Validate file type
        if (!file.type.match(/^image\/(jpeg|png)$/)) {
          throw new Error(`Invalid file type: ${file.type}. Only JPEG and PNG are allowed.`);
        }

        // Validate file size (50MB)
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 50MB.`);
        }

        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = carId
          ? `cars/${carId}/${timestamp}-${sanitizedFilename}`
          : `cars/temp/${timestamp}-${sanitizedFilename}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('jfautocars')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from('jfautocars').getPublicUrl(filePath);

        return publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);

      if (multiple) {
        if (replaceUrl) {
          // Replace the specific URL
          const newUrls = currentUrls.map(url => url === replaceUrl ? uploadedUrls[0] : url);
          onChange(newUrls);
        } else {
          onChange([...currentUrls, ...uploadedUrls]);
        }
      } else {
        onChange(uploadedUrls[0]);
      }
      
      // Clear the replace URL
      if (fileInputRef.current) {
        delete fileInputRef.current.dataset.replaceUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = (urlToRemove: string) => {
    if (multiple) {
      onChange(currentUrls.filter((url) => url !== urlToRemove));
    } else {
      onChange('');
    }
  };

  const handleReplace = (urlToReplace: string) => {
    if (fileInputRef.current) {
      // Store the URL to replace
      fileInputRef.current.dataset.replaceUrl = urlToReplace;
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {label && <label className="text-sm font-medium">{label}</label>}

      {/* File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Upload Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {multiple ? 'Upload Images' : 'Upload Image'}
          </>
        )}
      </Button>

      {/* Error Message */}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Image Previews */}
      {currentUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentUrls.map((url, index) => (
            <div key={index} className="relative group">
              <div className="relative w-full h-32 bg-gray-200 rounded-lg overflow-hidden">
                <Image
                  src={url}
                  alt={`Upload ${index + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
                {!multiple && (
                  <button
                    type="button"
                    onClick={() => handleReplace(url)}
                    className="absolute bottom-2 left-2 bg-blue-500 text-white rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Replace
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500">
        Accepted formats: JPEG, PNG. Maximum file size: 50MB
      </p>
    </div>
  );
}


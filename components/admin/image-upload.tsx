'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { X, Upload, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ImageUploadProps {
  value: string | string[] | null;
  onChange: (urls: string | string[]) => void;
  multiple?: boolean;
  label?: string;
  carId?: string;
}

interface PresignResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

async function presignAndPut(file: File, carId?: string): Promise<string> {
  const presignRes = await fetch('/api/admin/upload-url', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contentType: file.type,
      contentLength: file.size,
      filename: file.name,
      carId,
    }),
  });
  if (!presignRes.ok) {
    const err = (await presignRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? 'Failed to presign upload');
  }
  const { uploadUrl, publicUrl } = (await presignRes.json()) as PresignResponse;
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: file,
  });
  if (!putRes.ok) {
    throw new Error(`Upload failed (${putRes.status})`);
  }
  return publicUrl;
}

export function ImageUpload({ value, onChange, multiple = false, label, carId }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      for (const file of filesToProcess) {
        if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
          throw new Error(`Invalid file type: ${file.type}. Only JPEG, PNG, and WebP are allowed.`);
        }
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large. Maximum size is 50MB.`);
        }
      }

      const uploadedUrls = await Promise.all(filesToProcess.map((file) => presignAndPut(file, carId)));

      if (multiple) {
        if (replaceUrl) {
          const newUrls = currentUrls.map((url) => (url === replaceUrl ? uploadedUrls[0] : url));
          onChange(newUrls);
        } else {
          onChange([...currentUrls, ...uploadedUrls]);
        }
      } else {
        onChange(uploadedUrls[0]);
      }

      if (fileInputRef.current) {
        delete fileInputRef.current.dataset.replaceUrl;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
      fileInputRef.current.dataset.replaceUrl = urlToReplace;
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {label && <label className="text-sm font-medium">{label}</label>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

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

      {error && <p className="text-sm text-red-500">{error}</p>}

      {currentUrls.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {currentUrls.map((url, index) => (
            <div key={`${url}-${index}`} className="relative group">
              <div className="relative w-full h-32 bg-gray-200 rounded-lg overflow-hidden">
                <Image src={url} alt={`Upload ${index + 1}`} fill className="object-cover" />
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

      <p className="text-xs text-gray-500">Accepted formats: JPEG, PNG, WebP. Maximum file size: 50MB</p>
    </div>
  );
}

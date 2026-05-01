import { useState } from 'react';
import { apiRequest } from '@/shared/api/client';
import { ApiError } from '@/shared/api/errors';
import { Button } from '@/shared/ui/Button';
import { Label } from '@/shared/ui/Label';

export function ImagePicker({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  return (
    <div>
      <Label>{label}</Label>
      {value ? (
        <div className="mt-1 flex items-center gap-3">
          <img src={value} alt="" className="h-20 w-20 rounded-lg object-cover border border-zinc-200" />
          <Button type="button" variant="ghost" disabled={disabled || uploading} onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={disabled || uploading}
        className="mt-2 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          setLocalErr(null);
          setUploading(true);
          try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await apiRequest<{ url: string }>('/api/v1/catalog/upload', { method: 'POST', body: fd });
            onChange(res.url);
          } catch (err) {
            setLocalErr(err instanceof ApiError ? err.message : 'Upload failed');
          } finally {
            setUploading(false);
          }
        }}
      />
      {uploading ? <p className="mt-1 text-xs text-zinc-500">Uploading…</p> : null}
      {localErr ? <p className="mt-1 text-xs text-red-600">{localErr}</p> : null}
    </div>
  );
}

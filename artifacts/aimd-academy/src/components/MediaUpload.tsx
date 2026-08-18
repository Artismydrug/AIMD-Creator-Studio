import { useRef, useState } from 'react';
import { Upload, X, Loader2, Film } from 'lucide-react';

export type MediaType = 'image' | 'video';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

/**
 * Upload an image/video to the API server's object storage.
 * Returns the serving URL and detected media type.
 */
async function uploadMedia(file: File): Promise<{ url: string; mediaType: MediaType }> {
  const res = await fetch('/api/storage/uploads', {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    credentials: 'include',
    body: file,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? 'Upload failed');
  }
  const data = (await res.json()) as { objectPath: string; mediaType?: MediaType };
  return { url: `/api/storage${data.objectPath}`, mediaType: data.mediaType ?? 'image' };
}

/**
 * File picker + preview for studio uploads.
 * `allowVideo` also accepts mp4/mov/webm.
 */
export function MediaUpload({
  url,
  mediaType,
  onChange,
  allowVideo = false,
}: {
  url: string;
  mediaType: MediaType;
  onChange: (url: string, mediaType: MediaType) => void;
  allowVideo?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = allowVideo ? `${IMAGE_ACCEPT},${VIDEO_ACCEPT}` : IMAGE_ACCEPT;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    const isVideo = file.type.startsWith('video/');
    if (isVideo && !allowVideo) {
      setError('Only images are allowed here.');
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setError('Videos must be 100 MB or smaller.');
      return;
    }
    if (!isVideo && file.size > MAX_IMAGE_BYTES) {
      setError('Images must be 20 MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadMedia(file);
      onChange(result.url, result.mediaType);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed — please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {url ? (
        <div className="relative border border-border bg-muted overflow-hidden">
          {mediaType === 'video' ? (
            <video src={url} controls playsInline className="w-full max-h-64 bg-black" />
          ) : (
            <img src={url} alt="Upload preview" className="w-full max-h-64 object-contain bg-black/40" />
          )}
          <button
            type="button"
            onClick={() => onChange('', 'image')}
            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white transition-colors"
            title="Remove"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex flex-col items-center gap-2 py-8 border border-dashed border-border hover:border-primary/50 bg-background text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="font-mono text-xs uppercase tracking-widest">Uploading…</span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Upload className="w-6 h-6" />
                {allowVideo && <Film className="w-6 h-6" />}
              </div>
              <span className="font-mono text-xs uppercase tracking-widest">
                {allowVideo ? 'Upload photo or video' : 'Upload photo'}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {allowVideo ? 'JPG, PNG, GIF, MP4, MOV · up to 100 MB' : 'JPG, PNG, GIF · up to 20 MB'}
              </span>
            </>
          )}
        </button>
      )}

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}

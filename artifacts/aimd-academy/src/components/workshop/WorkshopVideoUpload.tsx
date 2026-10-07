import { useRef, useState } from 'react';
import { useRequestWorkshopVideoUpload, useFinalizeWorkshopVideoUpload } from '@workspace/api-client-react';
import { Loader2, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
type VideoType = (typeof TYPES)[number];
const LIMITS = { preview: 50 * 1024 * 1024, lesson: 250 * 1024 * 1024 };

interface Props {
  workshopId: number;
  kind: 'preview' | 'lesson';
  label: string;
  /** Called with the finalized immutable mediaUrl. Persist it yourself; nothing is attached until you save. */
  onUploaded: (mediaUrl: string) => void;
  disabled?: boolean;
  testId?: string;
}

/** Direct-to-storage workshop video uploader: request URL -> PUT to storage -> finalize. */
export function WorkshopVideoUpload({ workshopId, kind, label, onUploaded, disabled, testId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRequestWorkshopVideoUpload();
  const finalize = useFinalizeWorkshopVideoUpload();
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const maxMb = LIMITS[kind] / 1024 / 1024;

  const handleFile = async (file: File) => {
    if (!(TYPES as readonly string[]).includes(file.type)) {
      setPhase('error'); setMessage('Use an MP4 (recommended), MOV or WebM file.'); return;
    }
    if (file.size > LIMITS[kind]) {
      setPhase('error'); setMessage(`File is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${maxMb} MB.`); return;
    }
    setPhase('uploading'); setMessage('Uploading…');
    try {
      const { uploadURL, objectPath } = await request.mutateAsync({
        workshopId,
        data: { kind, contentType: file.type as VideoType, size: file.size },
      });
      const put = await fetch(uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
      if (!put.ok) throw new Error(`Storage rejected the upload (${put.status}).`);
      setMessage('Validating…');
      const { mediaUrl } = await finalize.mutateAsync({ workshopId, data: { objectPath } });
      onUploaded(mediaUrl);
      setPhase('done'); setMessage('Uploaded. Save to attach it.');
    } catch (e: any) {
      setPhase('error'); setMessage(e?.message || 'Upload failed. Try again.');
    }
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(',')}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleFile(f); }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || phase === 'uploading'}
        onClick={() => inputRef.current?.click()}
        className="rounded-none font-mono text-xs uppercase"
        data-testid={testId ? `${testId}-btn` : undefined}
      >
        {phase === 'uploading' ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5 mr-2" />}
        {label}
      </Button>
      <p className="font-mono text-[10px] text-muted-foreground uppercase">MP4 recommended · max {maxMb} MB</p>
      {phase !== 'idle' && (
        <p className={`font-mono text-xs flex items-center gap-1.5 ${phase === 'error' ? 'text-destructive' : phase === 'done' ? 'text-primary' : 'text-muted-foreground'}`}>
          {phase === 'error' ? <AlertTriangle className="w-3 h-3" /> : phase === 'done' ? <CheckCircle2 className="w-3 h-3" /> : null}
          {message}
        </p>
      )}
    </div>
  );
}

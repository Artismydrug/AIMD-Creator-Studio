import { useRef, useState } from 'react';
import { Upload, X, Loader2, Film, Mic, Video, Square, Play } from 'lucide-react';
import { Button } from './ui/button';

export type MediaType = 'image' | 'video' | 'audio';

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';
const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm';
const AUDIO_ACCEPT = 'audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/webm,audio/wav,audio/x-wav';
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

async function uploadMedia(file: File, purpose?: string): Promise<{ url: string; mediaType: MediaType }> {
  const headers: Record<string, string> = { 'Content-Type': file.type };
  if (purpose) headers['X-AIMD-UPLOAD-PURPOSE'] = purpose;
  const res = await fetch('/api/storage/uploads', {
    method: 'POST',
    headers,
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

import { useEffect } from 'react';

function MediaRecorderControl({
  onSave,
  allowVideo = false,
  allowAudio = false,
}: {
  onSave: (file: File) => void;
  allowVideo?: boolean;
  allowAudio?: boolean;
}) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [mode, setMode] = useState<'idle' | 'audio' | 'video'>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startStream = async (type: 'audio' | 'video') => {
    setError(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { facingMode: 'user' } : false,
      });
      setStream(s);
      setMode(type);
      if (type === 'video' && videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (e: any) {
      setError('Permission denied or device not found.');
    }
  };

  const startRecording = () => {
    if (!stream) return;
    chunks.current = [];
    const options = { mimeType: mode === 'video' ? 'video/webm' : 'audio/webm' };
    const mRecorder = new MediaRecorder(stream, options);
    
    mRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };
    
    mRecorder.onstop = () => {
      const b = new Blob(chunks.current, { type: options.mimeType });
      setBlob(b);
      setRecording(false);
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    };

    mRecorder.start();
    mediaRecorder.current = mRecorder;
    setRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
  };

  const reset = () => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setBlob(null);
    setMode('idle');
    setRecording(false);
  };

  const handleUse = () => {
    if (!blob) return;
    const ext = mode === 'video' ? 'webm' : 'webm';
    const file = new File([blob], `recording.${ext}`, { type: blob.type });
    onSave(file);
    reset();
  };

  if (blob) {
    const url = URL.createObjectURL(blob);
    return (
      <div className="border border-border p-4 bg-muted space-y-4">
        {mode === 'video' ? (
          <video src={url} controls className="w-full bg-black max-h-64 object-contain" />
        ) : (
          <audio src={url} controls className="w-full" />
        )}
        <div className="flex gap-2">
          <Button type="button" onClick={handleUse} className="flex-1 rounded-none font-mono uppercase text-xs" data-testid="recorder-use-btn">
            Use Recording
          </Button>
          <Button type="button" variant="outline" onClick={reset} className="rounded-none font-mono uppercase text-xs" data-testid="recorder-discard-btn">
            Discard
          </Button>
        </div>
      </div>
    );
  }

  if (mode !== 'idle') {
    return (
      <div className="border border-border p-4 bg-muted space-y-4">
        {mode === 'video' && (
          <div className="relative bg-black w-full max-h-64 overflow-hidden flex items-center justify-center">
            <video ref={videoRef} autoPlay muted playsInline className="max-h-64" />
            {recording && (
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/60 px-2 py-1 rounded">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-white font-mono text-[10px]">REC</span>
              </div>
            )}
          </div>
        )}
        
        {mode === 'audio' && recording && (
          <div className="h-16 flex items-center justify-center bg-black/10 border border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-sm uppercase text-red-500 font-bold tracking-widest">Recording...</span>
            </div>
          </div>
        )}
        
        <div className="flex justify-center gap-4">
          {!recording ? (
            <>
              <Button type="button" onClick={startRecording} className="rounded-none font-mono uppercase text-xs w-32 bg-red-500 hover:bg-red-600 text-white" data-testid="recorder-start-btn">
                <Play className="w-4 h-4 mr-2" /> Start
              </Button>
              <Button type="button" variant="outline" onClick={reset} className="rounded-none font-mono uppercase text-xs w-32" data-testid="recorder-cancel-btn">
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
            </>
          ) : (
            <Button type="button" onClick={stopRecording} className="rounded-none font-mono uppercase text-xs w-32 bg-red-500 hover:bg-red-600 text-white" data-testid="recorder-stop-btn">
              <Square className="w-4 h-4 mr-2" /> Stop
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2">
      {allowAudio && (
        <Button type="button" variant="outline" onClick={() => startStream('audio')} className="rounded-none font-mono uppercase text-[10px] h-7 px-2" data-testid="recorder-start-audio">
          <Mic className="w-3 h-3 mr-1" /> Record Audio
        </Button>
      )}
      {allowVideo && (
        <Button type="button" variant="outline" onClick={() => startStream('video')} className="rounded-none font-mono uppercase text-[10px] h-7 px-2" data-testid="recorder-start-video">
          <Video className="w-3 h-3 mr-1" /> Record Video
        </Button>
      )}
      {error && <p className="font-mono text-[10px] text-red-400 self-center ml-2">{error}</p>}
    </div>
  );
}

export function MediaUpload({
  url,
  mediaType,
  onChange,
  allowImage = true,
  allowVideo = false,
  allowAudio = false,
  purpose,
}: {
  url: string;
  mediaType: MediaType;
  onChange: (url: string, mediaType: MediaType) => void;
  allowImage?: boolean;
  allowVideo?: boolean;
  allowAudio?: boolean;
  purpose?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let accept = '';
  if (allowImage) accept += (accept ? ',' : '') + IMAGE_ACCEPT;
  if (allowVideo) accept += (accept ? ',' : '') + VIDEO_ACCEPT;
  if (allowAudio) accept += (accept ? ',' : '') + AUDIO_ACCEPT;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    
    if (isImage && !allowImage) {
      setError('Images are not allowed here.');
      return;
    }
    if (isVideo && !allowVideo) {
      setError('Videos are not allowed here.');
      return;
    }
    if (isAudio && !allowAudio) {
      setError('Audio is not allowed here.');
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setError('Videos must be 100 MB or smaller.');
      return;
    }
    if (isAudio && file.size > MAX_AUDIO_BYTES) {
      setError('Audio must be 25 MB or smaller.');
      return;
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setError('Images must be 20 MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadMedia(file, purpose);
      onChange(result.url, result.mediaType);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed — please try again.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  let title = 'Upload';
  let desc = '';
  if (allowImage && allowVideo) {
    title = 'Upload photo or video';
    desc = 'JPG, PNG, MP4, MOV · up to 100 MB';
  } else if (allowVideo && allowAudio) {
    title = 'Upload video or audio';
    desc = 'MP4, MOV, MP3, WAV · up to 100 MB';
  } else if (allowImage) {
    title = 'Upload photo';
    desc = 'JPG, PNG, GIF · up to 20 MB';
  } else if (allowVideo) {
    title = 'Upload video';
    desc = 'MP4, MOV, WEBM · up to 100 MB';
  } else if (allowAudio) {
    title = 'Upload audio';
    desc = 'MP3, WAV, M4A · up to 25 MB';
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        data-testid="media-upload-input"
      />

      {url ? (
        <div className="relative border border-border bg-muted overflow-hidden">
          {mediaType === 'video' ? (
            <video src={url} controls playsInline className="w-full max-h-64 bg-black" />
          ) : mediaType === 'audio' ? (
            <audio src={url} controls className="w-full mt-8 mb-4 px-4" />
          ) : (
            <img src={url} alt="Upload preview" className="w-full max-h-64 object-contain bg-black/40" />
          )}
          <button
            type="button"
            onClick={() => onChange('', 'image')}
            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white transition-colors"
            title="Remove"
            data-testid="media-remove-btn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {(allowVideo || allowAudio) && (
            <MediaRecorderControl onSave={handleFile} allowVideo={allowVideo} allowAudio={allowAudio} />
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full flex flex-col items-center gap-2 py-8 border border-dashed border-border hover:border-primary/50 bg-background text-muted-foreground hover:text-foreground transition-colors disabled:opacity-60"
            data-testid="media-upload-trigger"
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
                <span className="font-mono text-xs uppercase tracking-widest">{title}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{desc}</span>
              </>
            )}
          </button>
        </div>
      )}

      {error && <p className="font-mono text-xs text-red-400">{error}</p>}
    </div>
  );
}

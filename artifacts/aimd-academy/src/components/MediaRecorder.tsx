import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Mic, Video, Square, Play, X, UploadCloud, Loader2 } from 'lucide-react';
import { MediaType } from './MediaUpload';

export function MediaRecorderControl({
  onSave,
  allowVideo = true,
}: {
  onSave: (file: File, type: MediaType) => void;
  allowVideo?: boolean;
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
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
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
    onSave(file, mode as MediaType);
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
          <div className="h-16 flex items-center justify-center bg-black/10">
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
    <div className="border border-border p-4 bg-card flex flex-col items-center gap-3">
      <div className="font-mono text-xs uppercase text-muted-foreground text-center">Record Feedback</div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => startStream('audio')} className="rounded-none font-mono uppercase text-xs" data-testid="recorder-start-audio">
          <Mic className="w-4 h-4 mr-2" /> Record Audio
        </Button>
        {allowVideo && (
          <Button type="button" variant="outline" onClick={() => startStream('video')} className="rounded-none font-mono uppercase text-xs" data-testid="recorder-start-video">
            <Video className="w-4 h-4 mr-2" /> Record Video
          </Button>
        )}
      </div>
      {error && <p className="font-mono text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

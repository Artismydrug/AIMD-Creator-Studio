import { useCallback, useEffect, useRef, useState } from 'react';
import { useCreateWorkshopLessonPlayback } from '@workspace/api-client-react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Protected full-lesson playback. Signed URLs last 15 minutes; renew ~1 minute early keeping position. */
export function LessonPlayer({ workshopId, moduleId, onGate }: { workshopId: number; moduleId: number; onGate: () => void }) {
  const create = useCreateWorkshopLessonPlayback();
  const mutateRef = useRef(create.mutateAsync);
  mutateRef.current = create.mutateAsync;
  const onGateRef = useRef(onGate);
  onGateRef.current = onGate;
  const videoRef = useRef<HTMLVideoElement>(null);
  const resume = useRef<{ time: number; playing: boolean } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (renewing: boolean) => {
    if (renewing && videoRef.current) {
      resume.current = { time: videoRef.current.currentTime, playing: !videoRef.current.paused };
    }
    if (!renewing) { setLoading(true); setError(null); }
    try {
      const res = await mutateRef.current({ id: workshopId, moduleId });
      setUrl(res.playbackUrl);
      setExpiresAt(res.expiresAt);
      setError(null);
    } catch (e: any) {
      const status = e?.status;
      if (status === 401 || status === 402 || status === 403) onGateRef.current();
      setError(e?.message || 'Could not start this lesson.');
      if (renewing) setUrl(null);
    } finally {
      setLoading(false);
    }
  }, [workshopId, moduleId]);

  useEffect(() => { setUrl(null); void load(false); }, [load]);

  useEffect(() => {
    if (!expiresAt) return;
    const wait = Math.max(5000, new Date(expiresAt).getTime() - Date.now() - 60_000);
    const t = window.setTimeout(() => void load(true), wait);
    return () => window.clearTimeout(t);
  }, [expiresAt, load]);

  const restore = () => {
    const v = videoRef.current; const r = resume.current;
    if (!v || !r) return;
    v.currentTime = r.time;
    if (r.playing) void v.play().catch(() => undefined);
    resume.current = null;
  };

  if (error && !url) {
    return (
      <div className="aspect-video bg-muted flex items-center justify-center p-8 text-center" data-testid="lesson-error">
        <div className="max-w-md space-y-3">
          <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="rounded-none font-mono text-xs uppercase" onClick={() => void load(false)} data-testid="lesson-retry">
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }
  if (loading || !url) {
    return <div className="aspect-video bg-muted flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }
  return (
    <div className="aspect-video bg-black">
      <video ref={videoRef} src={url} controls playsInline controlsList="nodownload" onLoadedMetadata={restore} onError={() => { if (videoRef.current) resume.current = { time: videoRef.current.currentTime, playing: false }; setUrl(null); setError('The video could not be played. The link may have expired.'); }} className="w-full h-full object-contain" data-testid="lesson-video" />
    </div>
  );
}

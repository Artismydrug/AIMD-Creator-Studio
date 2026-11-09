import { useCallback, useEffect, useRef, useState } from 'react';
import { useCreateWorkshopLessonWebPlayback } from '@workspace/api-client-react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Protected browser playback. Signed URLs last five minutes; renew early and retain position. */
export function LessonPlayer({ workshopId, moduleId, onGate }: { workshopId: number; moduleId: number; onGate: () => void }) {
  const create = useCreateWorkshopLessonWebPlayback();
  const mutateRef = useRef(create.mutateAsync);
  mutateRef.current = create.mutateAsync;
  const onGateRef = useRef(onGate);
  onGateRef.current = onGate;
  const videoRef = useRef<HTMLVideoElement>(null);
  const resume = useRef<{ time: number; playing: boolean } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [watermarkLabel, setWatermarkLabel] = useState('');
  const [watermarkPosition, setWatermarkPosition] = useState(0);
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
      setWatermarkLabel(res.watermarkLabel);
      setError(null);
    } catch (e: any) {
      const status = e?.status;
      if (status === 401 || status === 402 || status === 403) onGateRef.current();
      setError(e?.message || 'Could not start this lesson.');
      if (renewing) { setUrl(null); setWatermarkLabel(''); }
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

  useEffect(() => {
    const timer = window.setInterval(() => setWatermarkPosition(position => (position + 1) % 4), 18_000);
    return () => window.clearInterval(timer);
  }, []);

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
  const watermarkTransforms = ['translate(-24px, -18px)', 'translate(24px, 16px)', 'translate(-18px, 20px)', 'translate(20px, -16px)'];
  return (
    <div className="aspect-video bg-black relative overflow-hidden">
      <video ref={videoRef} src={url} controls playsInline controlsList="nodownload" onLoadedMetadata={restore} onError={() => { if (videoRef.current) resume.current = { time: videoRef.current.currentTime, playing: false }; setUrl(null); setWatermarkLabel(''); setError('The video could not be played. The link may have expired.'); }} className="w-full h-full object-contain" data-testid="lesson-video" />
      {watermarkLabel && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" data-testid="lesson-viewer-watermark">
          <span
            className="max-w-[92%] rounded-md bg-black/25 px-2.5 py-1.5 font-mono text-[11px] tracking-wide text-white/50 transition-transform duration-[18000ms]"
            style={{ transform: watermarkTransforms[watermarkPosition] }}
          >
            {watermarkLabel}
          </span>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Film } from 'lucide-react';

/**
 * Official AIMD brand video player.
 *
 * Video source: drop `brand-video.mp4` into `artifacts/aimd-academy/public/`
 * (served from the site's public assets folder), or set VITE_BRAND_VIDEO_URL
 * to a direct video URL to override it.
 */
const BRAND_VIDEO_SRC: string =
  (import.meta.env.VITE_BRAND_VIDEO_URL as string | undefined) ||
  `${import.meta.env.BASE_URL}brand-video.mp4`;

export function BrandVideo({ poster }: { poster?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="glass-card rounded-xl p-2">
        <div className="w-full aspect-video rounded-lg bg-muted/60 border border-border flex flex-col items-center justify-center text-center px-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Film className="w-6 h-6 text-primary" />
          </div>
          <p className="font-display font-black uppercase tracking-tight text-xl mb-1">
            Brand Video Coming Soon
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Our official brand film is on its way. Check back shortly to watch the AIMD story.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-2">
      <video
        className="w-full aspect-video rounded-lg object-cover bg-black"
        src={BRAND_VIDEO_SRC}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        aria-label="AIMD official brand video"
      />
    </div>
  );
}

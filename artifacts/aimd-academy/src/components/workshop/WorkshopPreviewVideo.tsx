import { useEffect, useRef, type ComponentProps } from 'react';
import { trackEvent } from '@/lib/telemetry';

/** Count a view only once playback actually begins, never for a placeholder. */
export function WorkshopPreviewVideo(props: ComponentProps<'video'>) {
  const viewed = useRef(false);
  useEffect(() => { viewed.current = false; }, [props.src]);
  return <video {...props} onPlaying={(event) => {
    if (!viewed.current) { viewed.current = true; trackEvent('workshop_preview_viewed'); }
    props.onPlaying?.(event);
  }} />;
}

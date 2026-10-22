export const PROFILE_BRAND_ACCENTS = [
  { value: 'coral', label: 'Coral', color: '#D9432B' },
  { value: 'violet', label: 'Violet', color: '#6D28D9' },
  { value: 'mint', label: 'Mint', color: '#167C72' },
  { value: 'blue', label: 'Blue', color: '#2359B7' },
  { value: 'rose', label: 'Rose', color: '#B4235D' },
  { value: 'gold', label: 'Gold', color: '#986500' },
] as const;

export type ProfileBrandAccent = (typeof PROFILE_BRAND_ACCENTS)[number]['value'];

export function profileAccentColor(value: string | null | undefined) {
  return PROFILE_BRAND_ACCENTS.find((accent) => accent.value === value)?.color ?? PROFILE_BRAND_ACCENTS[0].color;
}

type SocialPlatform = 'instagram' | 'tiktok';

export function normalizeSocialProfileUrl(platform: SocialPlatform, input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const bareProfileUrl = platform === 'instagram'
    ? /^(?:www\.)?instagram\.com\//i.test(value)
    : /^(?:www\.)?tiktok\.com\//i.test(value);
  const candidate = bareProfileUrl ? `https://${value}` : value;
  let handle = candidate.replace(/^@/, '');
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      const allowedHosts = platform === 'instagram'
        ? ['instagram.com', 'www.instagram.com']
        : ['tiktok.com', 'www.tiktok.com'];
      if (
        url.protocol !== 'https:' ||
        !allowedHosts.includes(url.hostname.toLowerCase()) ||
        url.username || url.password || url.search || url.hash
      ) return null;
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length !== 1) return null;
      handle = segments[0].replace(/^@/, '');
    } catch {
      return null;
    }
  } else if (candidate.includes('/') || candidate.includes(':') || candidate.includes('?') || candidate.includes('#')) {
    return null;
  }

  const pattern = platform === 'instagram'
    ? /^[A-Za-z0-9._]{1,30}$/
    : /^[A-Za-z0-9._]{2,24}$/;
  if (!pattern.test(handle) || handle === '.' || handle === '..') return null;

  return platform === 'instagram'
    ? `https://www.instagram.com/${handle}/`
    : `https://www.tiktok.com/@${handle}`;
}

export function socialProfileHandle(platform: SocialPlatform, value: string | null | undefined): string {
  if (!value) return '';
  const normalized = normalizeSocialProfileUrl(platform, value);
  if (!normalized) return value;
  try {
    const path = new URL(normalized).pathname.split('/').filter(Boolean).at(-1) ?? '';
    return path.replace(/^@/, '');
  } catch {
    return value;
  }
}

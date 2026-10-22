type SocialPlatform = "instagram" | "tiktok";

export function isSafeProfileWebsite(value: string): boolean {
  if (value.length > 2048 || /[\s\u0000-\u001f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !!url.hostname &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function isValidSocialProfileUrl(platform: SocialPlatform, value: string): boolean {
  if (value.length > 300 || /[\s\u0000-\u001f]/.test(value)) return false;
  try {
    const url = new URL(value);
    const hosts = platform === "instagram"
      ? ["instagram.com", "www.instagram.com"]
      : ["tiktok.com", "www.tiktok.com"];
    if (
      url.protocol !== "https:" ||
      !hosts.includes(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) return false;
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return false;
    const handle = segments[0].replace(/^@/, "");
    const pattern = platform === "instagram"
      ? /^[A-Za-z0-9._]{1,30}$/
      : /^[A-Za-z0-9._]{2,24}$/;
    return pattern.test(handle) && handle !== "." && handle !== "..";
  } catch {
    return false;
  }
}

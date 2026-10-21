/** Only explicit web destinations may be opened or shared as an inquiry link. */
export function normalizeStudioLink(value: string | null | undefined): string | null {
  const link = value?.trim();
  if (!link || link.length > 2048 || /[\s\\\u0000-\u001F\u007F]/.test(link) || !/^https?:\/\//i.test(link)) return null;
  try {
    const parsed = new URL(link.replace(/^https?:/i, (scheme) => scheme.toLowerCase()));
    if (!parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function getStudioInquiryLink(member: {
  bookingOpen?: boolean | null;
  portfolioUrl?: string | null;
}): string | null {
  return member.bookingOpen ? normalizeStudioLink(member.portfolioUrl) : null;
}

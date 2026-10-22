const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../lib/studioInquiry.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = new Module(filename, module);
loaded._compile(compiled, filename);
const { normalizeStudioLink, getStudioInquiryLink } = loaded.exports;
const brandingPath = path.resolve(__dirname, '../lib/profileBranding.ts');
const brandingCompiled = ts.transpileModule(fs.readFileSync(brandingPath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const brandingModule = new Module(brandingPath, module);
brandingModule._compile(brandingCompiled, brandingPath);
const { normalizeSocialProfileUrl, profileAccentColor } = brandingModule.exports;

test('legacy website-link utility remains safely scoped to an enabled member', () => {
  assert.equal(getStudioInquiryLink({ bookingOpen: true, portfolioUrl: 'https://member.example/contact' }), 'https://member.example/contact');
  assert.equal(getStudioInquiryLink({ bookingOpen: false, portfolioUrl: 'https://member.example/contact' }), null);
  assert.equal(getStudioInquiryLink({ bookingOpen: true, portfolioUrl: '' }), null);
  assert.equal(getStudioInquiryLink({}), null);
});

test('links require an explicit web destination and never carry embedded credentials', () => {
  for (const value of [
    '', null, undefined, 'javascript:alert(1)', 'file:///private', 'mailto:a@example.com',
    'https://', '//example.com', 'https://user:password@example.com', 'https://user@example.com',
    'https://example.com/a b', 'https://example.com/' + 'a'.repeat(2048),
    'https://example.com\\@other.example', 'https://example.com/\u0000',
  ]) assert.equal(normalizeStudioLink(value), null, String(value));
  assert.equal(normalizeStudioLink('  https://example.com/contact?medium=painting  '), 'https://example.com/contact?medium=painting');
  assert.equal(normalizeStudioLink('http://example.com/contact'), 'http://example.com/contact');
  assert.equal(normalizeStudioLink('HTTPS://example.com/contact'), 'https://example.com/contact');
});

test('social handles normalize to safe platform profile links and reject impostor hosts', () => {
  assert.equal(normalizeSocialProfileUrl('instagram', '@poncho.art'), 'https://www.instagram.com/poncho.art/');
  assert.equal(normalizeSocialProfileUrl('instagram', 'instagram.com/poncho.art'), 'https://www.instagram.com/poncho.art/');
  assert.equal(normalizeSocialProfileUrl('tiktok', '@poncho_art'), 'https://www.tiktok.com/@poncho_art');
  assert.equal(normalizeSocialProfileUrl('tiktok', 'www.tiktok.com/@poncho_art'), 'https://www.tiktok.com/@poncho_art');
  for (const value of ['https://instagram.com.evil.test/poncho', 'javascript:alert(1)', 'https://user:pw@instagram.com/poncho', 'https://www.tiktok.com/@ok/video/123']) {
    assert.equal(normalizeSocialProfileUrl('instagram', value), null, `Instagram rejected ${value}`);
    assert.equal(normalizeSocialProfileUrl('tiktok', value), null, `TikTok rejected ${value}`);
  }
});

test('creator profile editor saves links, accent, profile fields and inquiries through their persisted settings paths', () => {
  const editor = fs.readFileSync(path.resolve(__dirname, '../app/edit-profile.tsx'), 'utf8');
  const portfolio = fs.readFileSync(path.resolve(__dirname, '../components/CreatorPortfolioView.tsx'), 'utf8');
  const inquirySettings = fs.readFileSync(path.resolve(__dirname, '../components/StudioInquirySettings.tsx'), 'utf8');
  for (const testID of ['creator-portfolio-url', 'creator-instagram-url', 'creator-tiktok-url', 'profile-brand-color-options', 'save-profile']) {
    assert.match(editor, new RegExp(`testID="${testID}"`));
  }
  for (const field of ['portfolioUrl', 'instagramUrl', 'tiktokUrl', 'profileAccentColor']) {
    assert.match(editor, new RegExp(`${field}(?:\\s*:|\\s*,)`));
    assert.match(portfolio, new RegExp(`creator\\.${field}`));
  }
  assert.match(editor, /avatarUrl \? \{ avatarUrl \} : \{\}/);
  assert.match(editor, /bio: bio\.trim\(\) \|\| null/);
  assert.match(portfolio, /Linking\.openURL\(url\)/);
  assert.match(portfolio, /testID="creator-instagram-link"/);
  assert.match(portfolio, /testID="creator-tiktok-link"/);
  assert.match(inquirySettings, /inquiryOptions: trimmedCategories/);
  assert.doesNotMatch(inquirySettings, /portfolioUrl: normalized/);
  assert.equal(profileAccentColor('violet'), '#6D28D9');
  assert.equal(profileAccentColor('unexpected'), '#D9432B');
});

test('inquiry settings and creator entry points use recipient-specific in-app forms', () => {
  const settings = fs.readFileSync(path.resolve(__dirname, '../components/StudioInquirySettings.tsx'), 'utf8');
  const card = fs.readFileSync(path.resolve(__dirname, '../components/CreatorCard.tsx'), 'utf8');
  const directory = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/directory.tsx'), 'utf8');
  const editor = fs.readFileSync(path.resolve(__dirname, '../app/edit-profile.tsx'), 'utf8');
  const studio = fs.readFileSync(path.resolve(__dirname, '../components/CreatorPortfolioView.tsx'), 'utf8');
  const ownerStudio = fs.readFileSync(path.resolve(__dirname, '../app/profile.tsx'), 'utf8');
  const creatorStudio = fs.readFileSync(path.resolve(__dirname, '../app/creator/[creatorId].tsx'), 'utf8');
  const inquiryScreen = fs.readFileSync(path.resolve(__dirname, '../app/commission-inquiry.tsx'), 'utf8');
  assert.match(settings, /bookingOpen: open,\s*inquiryOptions: trimmedCategories/);
  assert.doesNotMatch(settings, /portfolioUrl:/);
  assert.match(settings, /if \(lock\.current\) return/);
  assert.match(settings, /queryKey: getListDirectoryQueryKey\(\)/);
  assert.match(settings, /client\.setQueryData\(getGetCurrentUserQueryKey\(\), saved\)/);
  assert.match(settings, /testID="cancel-studio-inquiries"/);
  assert.match(settings, /No website required/);
  assert.doesNotMatch(settings, /normalizeStudioLink/);
  assert.match(settings, /Inquiry options/);
  assert.match(settings, /Move \$\{category\} up/);
  assert.match(settings, /Remove \$\{category\}/);
  assert.match(settings, /new Set\(normalizedCategories\)\.size !== normalizedCategories\.length/);
  assert.match(settings, /onPress=\{\(\) => moveCategory\(index, -1\)\}/);
  assert.match(settings, /onPress=\{\(\) => setCategories\(\(current\) => current\.filter/);
  assert.match(card, /const inquiryAvailable = !!creator\.bookingOpen/);
  assert.doesNotMatch(card, /Linking\.openURL/);
  assert.match(card, /onOpenProfile/);
  assert.match(directory, /pathname: '\/creator\/\[creatorId\]'/);
  assert.match(editor, /<StudioInquirySettings/);
  assert.match(editor, /testID="profile-basics-editor"/);
  assert.match(editor, /testID="delete-account"/);
  assert.match(studio, /inquiryAvailable/);
  // Categories are member-owned records, not a hard-coded list of art media.
  // Add/rename/remove, assignment and toggle behavior execute in studio-profile-layout-smoke.
  assert.match(studio, /workCategories\.map/);
  assert.match(studio, /post\.portfolioCategoryId === activeCategory\.id/);
  assert.match(ownerStudio, /useUpdatePortfolioCategories/);
  assert.match(ownerStudio, /useUpdateStudioPostCategory/);
  assert.match(studio, /testID="creator-work-tabs"/);
  assert.match(studio, /accessibilityRole="tab"/);
  assert.match(studio, /testID="creator-profile-inquiry-bottom"/);
  assert.match(ownerStudio, /limit: 100/);
  assert.match(creatorStudio, /limit: 100/);
  assert.match(ownerStudio, /pathname: '\/commission-inquiry',\s*params: \{ creatorId: me\.id, creatorName: me\.username \}/);
  assert.match(creatorStudio, /pathname: '\/commission-inquiry',\s*params: \{ creatorId: creator\.id, creatorName: creator\.username \}/);
  assert.match(card, /pathname: '\/commission-inquiry',\s*params: \{ creatorId: creator\.id, creatorName: creator\.username \}/);
  assert.match(inquiryScreen, /createTattooBookingDraft/);
  assert.match(inquiryScreen, /submitTattooBooking/);
  assert.match(inquiryScreen, /\/api\/tattoo-bookings\/\$\{draft\.id\}\/references/);
  assert.match(inquiryScreen, /type ProjectType = string/);
  assert.match(inquiryScreen, /creatorProfile\?\.inquiryOptions/);
  assert.match(inquiryScreen, /projectOptions\.map/);
  assert.match(inquiryScreen, /preferredArtist: creatorName/);
  assert.match(inquiryScreen, /INQUIRY FOR · \{creatorName\.toUpperCase\(\)\}/);
  assert.match(inquiryScreen, /rawCreatorName\?\.trim\(\)\.replace\(\/\^@\/, ''\)\.slice\(0, 120\)/);
  assert.doesNotMatch(inquiryScreen, /Edwin|Ash|Preferred artist|const ARTISTS/);
  assert.match(inquiryScreen, /creatorUserId/);
  assert.match(inquiryScreen, /Your details and photos stay private to this creator and authorized AIMD staff/);
  assert.match(inquiryScreen, /creatorProfile\?\.inquiryOptions/);
  assert.match(inquiryScreen, /projectOptions\.map/);
  assert.match(settings, /public studio and Creator Directory/);
  assert.doesNotMatch(settings, /ponchotheartist|example.*@/i);
});

test('Edit Profile header clears the web status area and native safe area', () => {
  const editor = fs.readFileSync(path.resolve(__dirname, '../app/edit-profile.tsx'), 'utf8');
  assert.match(editor, /paddingTop: Platform\.OS === 'web' \? 67 : insets\.top \+ 8/);
});

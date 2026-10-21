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

test('inquiries use the individual member link and are hidden when switched off', () => {
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

test('save, cancel and sharing retain clear member ownership and directory remains list-only', () => {
  const settings = fs.readFileSync(path.resolve(__dirname, '../components/StudioInquirySettings.tsx'), 'utf8');
  const card = fs.readFileSync(path.resolve(__dirname, '../components/CreatorCard.tsx'), 'utf8');
  assert.match(settings, /data: \{ portfolioUrl: normalized, bookingOpen: open \}/);
  assert.match(settings, /if \(lock\.current\) return/);
  assert.match(settings, /queryKey: getListDirectoryQueryKey\(\)/);
  assert.match(settings, /client\.setQueryData\(getGetCurrentUserQueryKey\(\), saved\)/);
  assert.match(settings, /testID="cancel-studio-inquiries"/);
  assert.match(settings, /Share\.share\(\{ message: activeLink/);
  assert.match(card, /getStudioInquiryLink\(creator\)/);
  assert.match(card, /await Linking\.openURL\(inquiryLink\)/);
  assert.doesNotMatch(card, /\/creator\/|router\.push/);
  assert.doesNotMatch(settings, /ponchotheartist|example.*@/i);
});

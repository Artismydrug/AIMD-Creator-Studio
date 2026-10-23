const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { createHash } = require('node:crypto');
const { assertNativeUiBundle, verifyNativeExport, requiredMarkers } = require('./native-release-contract');

test('current UI markers pass while an old single-card release is rejected', () => {
  assert.doesNotThrow(() => assertNativeUiBundle(requiredMarkers.join('\n'), 'ios'));
  assert.throws(
    () => assertNativeUiBundle('workshops-coming-soon Your canvas Creator Arcade', 'ios'),
    /missing dashboard-canvas-carousel/,
  );
});

test('each current release UI marker is required in the compiled bundle', () => {
  for (const marker of requiredMarkers) {
    assert.throws(
      () => assertNativeUiBundle(requiredMarkers.filter(item => item !== marker).join('\n'), 'ios'),
      new RegExp(`missing ${marker}`),
    );
  }
});

test('retired Habits title is rejected even if other current markers exist', () => {
  assert.throws(
    () => assertNativeUiBundle(`${requiredMarkers.join('\n')}\nHabits & Challenges`, 'ios'),
    /retired Habits/,
  );
});

test('production builder owns a fresh Metro session and validates its downloaded bundles', () => {
  const build = fs.readFileSync(path.join(__dirname, 'build.js'), 'utf8');
  assert(!build.includes('Metro already running'));
  assert(build.includes("'--clear'"));
  assert(build.includes('metroPort = await chooseMetroPort()'));
  const release = fs.readFileSync(path.join(__dirname, 'release-content-smoke.js'), 'utf8');
  assert(release.includes('assertNativeUiBundle(bundle, platform)'));
});

test('installed iOS build number comes from native metadata, never a hardcoded TestFlight number', () => {
  const profile = fs.readFileSync(path.join(__dirname, '../app/edit-profile.tsx'), 'utf8');
  assert(profile.includes('Constants.platform?.ios?.buildNumber'));
  assert(profile.includes('testID="installed-build-info"'));
  assert(profile.includes('Development preview'));
});

test('export verification checks packaged artwork bytes and missing manifest assets', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'aimd-native-export-'));
  try {
    fs.mkdirSync(path.join(directory, 'assets'));
    const assets = [
      'daily-habit-workspace.jpg', 'workshop-preview.jpg', 'sticker-jam-sketchbook.jpg',
      'aimd-events-market-backdrop.jpg', 'los-feliz-flea-flyer.jpg',
    ].map(image => {
      const source = fs.readFileSync(path.join(__dirname, '../assets/images', image));
      const hash = createHash('md5').update(source).digest('hex');
      const assetPath = `assets/${hash}`;
      fs.writeFileSync(path.join(directory, assetPath), source);
      return { path: assetPath, ext: 'jpg' };
    });
    fs.writeFileSync(path.join(directory, 'entry.js'), requiredMarkers.join('\n'));
    fs.writeFileSync(path.join(directory, 'metadata.json'), JSON.stringify({
      fileMetadata: { ios: { bundle: 'entry.js', assets } },
    }));
    assert.equal(verifyNativeExport(directory)[0].assetCount, 5);
    fs.writeFileSync(path.join(directory, assets[0].path), 'corrupt artwork');
    assert.throws(() => verifyNativeExport(directory), /exported artwork differs/);
    fs.unlinkSync(path.join(directory, assets[0].path));
    assert.throws(() => verifyNativeExport(directory), /ENOENT/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const projectRoot = path.resolve(__dirname, '..');
const requiredMarkers = [
  'dashboard-canvas-carousel',
  'dashboard-active-habit-slide',
  'dashboard-workshop-slide',
  'dashboard-mini-habit-studio-open',
  'dashboard-events-slide',
  'dashboard-your-canvas-card',
  'creator-work-grid',
  'creator-following-stat',
  'edit-profile-navigation',
  'creator-profile-inquiry-bottom',
  'installed-build-info',
];
const heroImages = [
  'daily-habit-workspace.jpg',
  'workshop-preview.jpg',
  'sticker-jam-sketchbook.jpg',
  'aimd-events-market-backdrop.jpg',
  'los-feliz-flea-flyer.jpg',
];

function assertNativeUiBundle(bundle, platform) {
  for (const marker of requiredMarkers) {
    assert(bundle.includes(marker), `${platform} bundle is stale or incomplete: missing ${marker}.`);
  }
  assert(!bundle.includes('Habits & Challenges'), `${platform} bundle still contains the retired Habits & Challenges title.`);
}

function readExportFile(directory, relativePath) {
  assert.equal(typeof relativePath, 'string', 'Export contains an invalid file path.');
  const filePath = path.resolve(directory, relativePath);
  assert(filePath.startsWith(`${path.resolve(directory)}${path.sep}`), 'Export file must stay inside the output directory.');
  const file = fs.readFileSync(filePath);
  assert(file.length > 0, `Empty exported file: ${relativePath}`);
  return file;
}

function verifyNativeExport(directory) {
  const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'metadata.json'), 'utf8'));
  const platforms = ['ios', 'android'].filter(platform => metadata.fileMetadata?.[platform]);
  assert(platforms.length > 0, 'No native platform bundles were found in the export.');
  const imageHashes = heroImages.map(image => createHash('md5')
    .update(fs.readFileSync(path.join(projectRoot, 'assets/images', image))).digest('hex'));
  assert.equal(new Set(imageHashes).size, heroImages.length, 'Dashboard artwork must use distinct images.');

  const results = platforms.map(platform => {
    const entry = metadata.fileMetadata[platform];
    const bundle = readExportFile(directory, entry.bundle);
    assertNativeUiBundle(bundle.toString('utf8'), platform);
    assert(Array.isArray(entry.assets) && entry.assets.length > 0, `${platform} has no asset manifest.`);
    for (const asset of entry.assets) readExportFile(directory, asset.path);
    const emittedAssets = new Map(entry.assets.map(asset => [path.basename(asset.path), asset.path]));
    imageHashes.forEach((hash, index) => {
      const emittedPath = emittedAssets.get(hash);
      assert(emittedPath, `${platform} export is missing ${heroImages[index]}.`);
      assert.equal(
        createHash('md5').update(readExportFile(directory, emittedPath)).digest('hex'),
        hash,
        `${platform} exported artwork differs from ${heroImages[index]}.`,
      );
    });
    return { platform, bundleSha256: createHash('sha256').update(bundle).digest('hex'), assetCount: entry.assets.length };
  });
  console.log('Native UI export verified: four carousel slides, distinct artwork, current Studio actions, and intact assets.');
  console.log(JSON.stringify(results, null, 2));
  return results;
}

module.exports = { assertNativeUiBundle, verifyNativeExport, requiredMarkers };
if (require.main === module) {
  assert(process.argv[2], 'Usage: pnpm run verify:native-export <export-directory>');
  verifyNativeExport(path.resolve(process.argv[2]));
}

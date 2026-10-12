const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

const projectRoot = path.resolve(__dirname, '..');
const iconPath = './assets/images/aimd-ivory-ink-icon.png';
const approvedHash = 'dbbb95fca20529be1caaa082e1d96013ca3e52e240e60e7f9cfc7ed4a0e502fe';

function assertReleaseContentContract() {
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8')).expo;
  assert.equal(config.icon, iconPath, 'Generic icon must use approved option 14.');
  assert.equal(config.ios.icon, iconPath, 'iOS icon must explicitly use approved option 14.');
  const icon = fs.readFileSync(path.join(projectRoot, iconPath));
  assert.equal(createHash('sha256').update(icon).digest('hex'), approvedHash, 'Icon artwork differs from approved option 14.');
  assert.equal(icon.readUInt32BE(16), 1024);
  assert.equal(icon.readUInt32BE(20), 1024);
  const workshops = fs.readFileSync(path.join(projectRoot, 'app/(tabs)/workshops.tsx'), 'utf8');
  assert(workshops.includes('workshops-coming-soon'), 'Workshop empty state must contain coming-soon cards.');
  assert(workshops.includes('COMING_SOON_WORKSHOP_PREVIEWS.map'));
}

function publishReleaseIcon(timestamp, baseUrl, basePath = '') {
  assertReleaseContentContract();
  const output = path.join(projectRoot, 'static-build', timestamp, 'assets', 'brand');
  fs.mkdirSync(output, { recursive: true });
  fs.copyFileSync(path.join(projectRoot, iconPath), path.join(output, path.basename(iconPath)));
  return `${baseUrl}${basePath}/${timestamp}/assets/brand/${path.basename(iconPath)}`;
}

function assertBuiltReleaseContent(manifests, timestamp) {
  for (const platform of ['ios', 'android']) {
    assert.equal(manifests[platform].extra.expoClient.icon, iconPath, `${platform} manifest used stale icon configuration.`);
    const iconUrl = new URL(manifests[platform].extra.expoClient.iconUrl);
    assert.equal(iconUrl.protocol, 'https:');
    assert(!['localhost', '127.0.0.1'].includes(iconUrl.hostname), 'Manifest icon must not point to the build machine.');
    const bundle = fs.readFileSync(path.join(projectRoot, 'static-build', timestamp, '_expo/static/js', platform, 'bundle.js'), 'utf8');
    assert(bundle.includes('workshops-coming-soon'), `${platform} bundle is missing the four workshop previews.`);
    assert(bundle.includes('Could not confirm delivery'), `${platform} bundle is missing the message-draft safeguards.`);
  }
}

module.exports = { assertReleaseContentContract, publishReleaseIcon, assertBuiltReleaseContent };
if (require.main === module) {
  assertReleaseContentContract();
  console.log('Approved icon 14 and workshop preview source checks passed.');
}

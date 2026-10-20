const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const config = require('../metro.config');

const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '../..');

test('Metro watches shared libraries and dependencies, not unrelated sibling apps', () => {
  assert.equal(config.projectRoot, projectRoot);
  assert.ok(config.watchFolders.includes(path.join(workspaceRoot, 'node_modules')));
  assert.ok(config.watchFolders.includes(path.join(workspaceRoot, 'lib/api-client-react')));
  for (const folder of config.watchFolders) {
    assert.ok(
      path.dirname(folder) !== path.join(workspaceRoot, 'artifacts') || folder === projectRoot,
      `Unrelated artifact is being watched: ${folder}`,
    );
  }
});

test('Metro ignores generated mobile bundles without blocking application source', () => {
  const blocked = (file) => config.resolver.blockList.some((pattern) => pattern.test(file));
  assert.ok(blocked(path.join(projectRoot, 'static-build/bundle.js')));
  assert.ok(blocked(path.join(projectRoot, 'static-build')));
  assert.ok(blocked(path.join(projectRoot, '.expo/types/router.d.ts')));
  assert.equal(blocked(path.join(projectRoot, 'app/feed.tsx')), false);
  assert.equal(blocked(path.join(workspaceRoot, 'lib/api-client-react/src/index.ts')), false);
  assert.equal(blocked(path.join(projectRoot, 'static-build-helper.js')), false);
});

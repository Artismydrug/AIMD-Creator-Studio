const fs = require('fs');
const path = require('path');

const hqPath = path.resolve(__dirname, '..', 'app', '(tabs)', 'hq.tsx');

function assertIncludes(source, value, description) {
  if (!source.includes(value)) {
    throw new Error(`HQ loading smoke contract missing ${description}: ${value}`);
  }
}

function assertHqLoadingSmokeContract() {
  const source = fs.readFileSync(hqPath, 'utf8');

  assertIncludes(source, 'HQ_REQUEST_TIMEOUT_MS', 'bounded metrics request');
  assertIncludes(source, 'new AbortController()', 'abortable metrics request');
  assertIncludes(source, 'controller.abort()', 'request timeout and cleanup');
  assertIncludes(source, 'Promise.race([request, timeoutPromise])', 'whole-operation timeout');
  assertIncludes(source, "reject(new Error('HQ metrics request timed out.'))", 'token acquisition timeout');
  assertIncludes(source, 'Could not load HQ metrics.', 'visible error state');
  assertIncludes(source, 'setRetryNonce((value) => value + 1)', 'visible retry action');
  assertIncludes(source, 'accessibilityRole="button"', 'accessible retry control');

  console.log('HQ loading smoke contract passed');
}

if (require.main === module) {
  try {
    assertHqLoadingSmokeContract();
  } catch (error) {
    console.error(`HQ loading smoke contract failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  assertHqLoadingSmokeContract,
};
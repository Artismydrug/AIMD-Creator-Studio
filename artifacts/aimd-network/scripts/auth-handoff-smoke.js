const fs = require('fs');
const path = require('path');

const layoutPath = path.resolve(__dirname, '..', 'app', '_layout.tsx');

function assertIncludes(source, value, description) {
  if (!source.includes(value)) {
    throw new Error(`Auth handoff smoke contract missing ${description}: ${value}`);
  }
}

function assertAuthHandoffSmokeContract() {
  const source = fs.readFileSync(layoutPath, 'utf8');

  assertIncludes(source, 'readyUserId !== userId', 'signed-in readiness gate');
  assertIncludes(source, 'const token = await withTimeout(', 'timed token readiness check');
  assertIncludes(source, 'queryClient.clear()', 'stale query cleanup');
  assertIncludes(source, 'testID="session-preparation-screen"', 'visible preparation screen');
  assertIncludes(source, 'testID="session-preparation-retry"', 'visible retry action');
  assertIncludes(source, 'TOKEN_ATTEMPTS', 'bounded token retry behavior');
  assertIncludes(source, 'TOKEN_TIMEOUT_MS', 'per-attempt token timeout');
  assertIncludes(source, 'TOKEN_BOOTSTRAP_LEASE_MS', 'prepared-token bootstrap lease');
  assertIncludes(source, 'preparedToken.current', 'prepared token reuse');
  assertIncludes(source, 'reloadAppAsync()', 'Clerk startup recovery action');
  assertIncludes(source, '<ClerkLoading>', 'visible Clerk startup state');

  console.log('Authenticated app handoff smoke contract passed');
  console.log('Release gate: protected tabs mount only after a usable Clerk token exists');
}

if (require.main === module) {
  try {
    assertAuthHandoffSmokeContract();
  } catch (error) {
    console.error(`Auth handoff smoke contract failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  assertAuthHandoffSmokeContract,
};
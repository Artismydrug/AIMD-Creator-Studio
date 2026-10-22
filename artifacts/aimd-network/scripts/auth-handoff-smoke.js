const fs = require('fs');
const path = require('path');
const ts = require('typescript');

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
  assertIncludes(source, 'testID="session-preparation-reset"', 'user-initiated stale session reset');
  assertIncludes(source, 'await signOut()', 'Clerk-managed secure session cleanup');
  assertIncludes(source, 'setAuthTokenGetter(null)', 'authenticated API token getter cleanup');
  assertIncludes(source, 'queryClient.clear()', 'authenticated query cache cleanup');
  assertIncludes(source, 'setResetError(', 'visible recovery failure state');
  assertIncludes(source, 'TOKEN_ATTEMPTS', 'bounded token retry behavior');
  assertIncludes(source, 'TOKEN_TIMEOUT_MS', 'per-attempt token timeout');
  assertIncludes(source, 'TOKEN_BOOTSTRAP_LEASE_MS', 'prepared-token bootstrap lease');
  assertIncludes(source, 'preparedToken.current', 'prepared token reuse');
  assertIncludes(source, 'const getTokenRef = useRef(getToken)', 'stable token getter reference');
  assertIncludes(source, 'getTokenRef.current = getToken', 'latest Clerk token getter');
  assertIncludes(source, '}, [isLoaded, userId]);', 'continuous API token getter registration');
  assertIncludes(source, 'getTokenRef.current({ skipCache: attempt > 0 })', 'fresh token retry');
  assertIncludes(source, 'verifyAuthenticatedApiSession(token)', 'server-accepted session gate');
  assertIncludes(source, '/api/users/me', 'authenticated API readiness probe');
  assertIncludes(source, 'reloadAppAsync()', 'Clerk startup recovery action');
  assertIncludes(source, '<ClerkLoading>', 'visible Clerk startup state');

  // This fallback renders before AppearanceProvider. A theme-context hook here
  // crashes cold launch even though TypeScript and the normal tab routes pass.
  const file = ts.createSourceFile(layoutPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const preparationScreen = file.statements.find(
    node => ts.isFunctionDeclaration(node) && node.name?.text === 'SessionPreparationScreen',
  );
  if (!preparationScreen) throw new Error('Missing session-preparation screen');
  function assertProviderIndependent(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
      && ['useColors', 'useAppearance'].includes(node.expression.text)) {
      throw new Error('Startup screen cannot require appearance context before its provider mounts');
    }
    ts.forEachChild(node, assertProviderIndependent);
  }
  assertProviderIndependent(preparationScreen);

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
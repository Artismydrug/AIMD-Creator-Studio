const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

const source = readFileSync(resolve(__dirname, '../lib/sessionSecurity.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const sandbox = { exports: {}, require: () => ({}) };
vm.runInNewContext(compiled, sandbox);
const {
  createSessionSecurityStore,
  isSessionInactiveExpired,
  SESSION_INACTIVITY_TIMEOUT_MS,
} = sandbox.exports;

function fixture() {
  const data = new Map();
  let failNext = false;
  const storage = {
    getItemAsync: async key => data.get(key) ?? null,
    setItemAsync: async (key, value) => {
      await new Promise(resolve => setTimeout(resolve, 5));
      if (failNext) { failNext = false; throw new Error('Storage unavailable'); }
      data.set(key, value);
    },
    deleteItemAsync: async key => { data.delete(key); },
  };
  return {
    store: createSessionSecurityStore(storage),
    data,
    failNextWrite: () => { failNext = true; },
  };
}

test('biometric preference persists across store recreation without saving credentials', async () => {
  const { store, data } = fixture();
  assert.equal(await store.getBiometricEnabled('user_one'), false);
  await store.setBiometricEnabled('user_one', true);
  assert.equal(await store.getBiometricEnabled('user_one'), true);
  const reopened = createSessionSecurityStore({
    getItemAsync: async key => data.get(key),
    setItemAsync: async () => {},
    deleteItemAsync: async () => {},
  });
  assert.equal(await reopened.getBiometricEnabled('user_one'), true);
  assert.deepEqual([...data.values()], ['true']);
  assert.equal(await reopened.getBiometricEnabled('user_two'), false);
});

test('racing writes and reads complete in order; deletion wins over an older write', async () => {
  const { store } = fixture();
  const enable = store.setBiometricEnabled('user_one', true);
  const disable = store.setBiometricEnabled('user_one', false);
  const read = store.getBiometricEnabled('user_one');
  await Promise.all([enable, disable]);
  assert.equal(await read, false);
  await Promise.all([store.setBiometricEnabled('user_one', true), store.clearAccount('user_one')]);
  assert.equal(await store.getBiometricEnabled('user_one'), false);
});

test('failed storage writes do not poison retries or publish a successful setting change', async () => {
  const { store, failNextWrite } = fixture();
  const changes = [];
  const unsubscribe = store.subscribe((id, enabled) => changes.push([id, enabled]));
  failNextWrite();
  await assert.rejects(store.setBiometricEnabled('user_one', true));
  assert.equal(changes.length, 0);
  await store.setBiometricEnabled('user_one', true);
  assert.deepEqual(changes, [['user_one', true]]);
  unsubscribe();
  await store.clearAccount('user_one');
  assert.equal(changes.length, 1);
});

test('30-day inactivity cutoff expires at the boundary but preserves new and future activity', () => {
  const now = 2_000_000_000_000;
  assert.equal(isSessionInactiveExpired(null, now), false);
  assert.equal(isSessionInactiveExpired(now - SESSION_INACTIVITY_TIMEOUT_MS + 1, now), false);
  assert.equal(isSessionInactiveExpired(now - SESSION_INACTIVITY_TIMEOUT_MS, now), true);
  assert.equal(isSessionInactiveExpired(Number.NaN, now), true);
  assert.equal(isSessionInactiveExpired(now + 60_000, now), false);
});

test('inactivity timestamps persist per account and are cleared on sign-out or account deletion', async () => {
  const { store, data } = fixture();
  await store.recordActivity('user_one', 'session_one', 1_900_000_000_000);
  await store.recordActivity('user_two', 'session_two', 1_900_000_500_000);
  assert.equal(await store.getLastActiveAt('user_one', 'session_one'), 1_900_000_000_000);
  assert.equal(await store.getLastActiveAt('user_one', 'fresh_session'), null);
  await store.clearLastActiveAt('user_one', 'session_one');
  assert.equal(await store.getLastActiveAt('user_one', 'session_one'), null);
  assert.equal(await store.getLastActiveAt('user_two', 'session_two'), 1_900_000_500_000);
  await store.recordActivity('user_one', 'fresh_session', 1_900_001_000_000);
  await store.clearLastActiveAt('user_one', 'session_one');
  assert.equal(await store.getLastActiveAt('user_one', 'fresh_session'), 1_900_001_000_000);
  await store.clearAccount('user_one');
  assert.equal(await store.getLastActiveAt('user_one', 'fresh_session'), null);
  assert.equal(data.has('aimd.auth-security.v1.user_one.last-active'), false);
  assert.equal(await store.getLastActiveAt('user_two', 'session_two'), 1_900_000_500_000);
});

test('native security wiring retains Clerk token cache and recoverable lock controls', () => {
  const layout = readFileSync(resolve(__dirname, '../app/_layout.tsx'), 'utf8');
  const gate = readFileSync(resolve(__dirname, '../components/SessionSecurity.tsx'), 'utf8');
  const config = JSON.parse(readFileSync(resolve(__dirname, '../app.json'), 'utf8'));
  assert.ok(layout.includes('tokenCache={tokenCache}'));
  assert.ok(layout.includes('<SessionSecurityGate>'));
  assert.ok(gate.includes('getLastActiveAt(userId, sessionId)'));
  assert.ok(gate.includes('isSessionInactiveExpired(lastActiveAt)'));
  assert.ok(gate.includes("activityAllowed && AppState.currentState === 'active'"));
  assert.ok(gate.includes('session-inactivity-sign-in'));
  assert.ok(gate.includes('session-biometric-retry'));
  assert.ok(gate.includes('session-security-sign-out'));
  assert.ok(gate.includes('identityRef.current !== activeIdentity'));
  assert.ok(gate.includes("nextState !== 'active' || backgroundedAt.current == null"));
  assert.ok(config.expo.plugins.some(plugin => Array.isArray(plugin) && plugin[0] === 'expo-local-authentication'));
});

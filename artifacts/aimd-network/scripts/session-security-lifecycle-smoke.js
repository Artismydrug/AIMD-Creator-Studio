const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function compile(path) {
  return ts.transpileModule(readFileSync(resolve(__dirname, path), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    },
  }).outputText;
}
const storeSandbox = { exports: {}, require: () => ({}) };
vm.runInNewContext(compile('../lib/sessionSecurity.ts'), storeSandbox);
const { createSessionSecurityStore, SESSION_INACTIVITY_TIMEOUT_MS } = storeSandbox.exports;
const gateCode = compile('../components/SessionSecurity.tsx');
const jsx = (type, props) => ({ type, props });
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

async function mountGate({ age = 0, biometric = false, sessionId = 'session_one', results = [] } = {}) {
  const data = new Map(), hooks = [], listeners = new Set(), intervals = new Map();
  let cursor = 0, dirty = true, tree, now = 2_000_000_000_000, intervalId = 0;
  let signOuts = 0, prompts = 0;
  const backingStore = createSessionSecurityStore({
    getItemAsync: async key => data.get(key) ?? null,
    setItemAsync: async (key, value) => { data.set(key, value); },
    deleteItemAsync: async key => { data.delete(key); },
  });
  const store = {
    ...backingStore,
    recordActivity: (userId, activeSessionId, timestamp = now) =>
      backingStore.recordActivity(userId, activeSessionId, timestamp),
  };
  await store.recordActivity('user_one', 'session_one', now - age);
  if (biometric) await store.setBiometricEnabled('user_one', true);
  const auth = { userId: 'user_one', sessionId, signOut: async () => { signOuts++; } };
  const appState = {
    currentState: 'active',
    addEventListener: (_, callback) => {
      listeners.add(callback);
      return { remove: () => listeners.delete(callback) };
    },
  };
  const effects = [];
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!hooks[i]) hooks[i] = { value: initial };
      return [hooks[i].value, next => {
        const value = typeof next === 'function' ? next(hooks[i].value) : next;
        if (!Object.is(value, hooks[i].value)) { hooks[i].value = value; dirty = true; }
      }];
    },
    useRef(initial) { const i = cursor++; return hooks[i] ||= { current: initial }; },
    useCallback(callback, deps) {
      const i = cursor++;
      if (!hooks[i] || !same(hooks[i].deps, deps)) hooks[i] = { callback, deps };
      return hooks[i].callback;
    },
    useEffect(callback, deps) {
      const i = cursor++;
      if (!hooks[i] || !same(hooks[i].deps, deps)) {
        const previous = hooks[i];
        hooks[i] = { deps };
        effects.push(() => {
          previous?.cleanup?.();
          hooks[i].cleanup = callback();
        });
      }
    },
  };
  const native = Object.fromEntries(
    ['ActivityIndicator', 'Pressable', 'Switch', 'Text', 'View'].map(name => [name, name]),
  );
  const sandbox = {
    exports: {}, console,
    Date: class extends Date { static now() { return now; } },
    setInterval: callback => { const id = ++intervalId; intervals.set(id, callback); return id; },
    clearInterval: id => intervals.delete(id),
    require(name) {
      const dependencies = {
        react,
        'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
        'react-native': { ...native, AppState: appState, Platform: { OS: 'ios' }, Alert: { alert() {} }, StyleSheet: { create: value => value } },
        '@expo/vector-icons': { Feather: 'Feather' },
        'expo-local-authentication': { authenticateAsync: async () => { prompts++; return results.shift() ?? { success: true }; } },
        '@clerk/expo': { useAuth: () => auth },
        'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
        '@/hooks/useColors': { useColors: () => ({}) },
        '@/lib/sessionSecurity': {
          ...storeSandbox.exports, sessionSecurityStore: store,
          isSessionInactiveExpired: timestamp =>
            storeSandbox.exports.isSessionInactiveExpired(timestamp, now),
        },
      };
      if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  };
  vm.runInNewContext(gateCode, sandbox);
  async function settle() {
    for (let attempt = 0; attempt < 30; attempt++) {
      if (dirty) {
        dirty = false;
        cursor = 0;
        tree = sandbox.exports.SessionSecurityGate({ children: 'private-content' });
        effects.splice(0).forEach(effect => effect());
      }
      await new Promise(setImmediate);
      if (!dirty) return;
    }
    throw new Error('Session gate did not settle');
  }
  await settle();
  return {
    auth, appState, store, settle,
    get tree() { return tree; }, get signOuts() { return signOuts; }, get prompts() { return prompts; },
    advance: ms => { now += ms; },
    emit: state => { appState.currentState = state; [...listeners].forEach(callback => callback(state)); },
    tick: () => [...intervals.values()].forEach(callback => callback()),
  };
}
function find(node, id) {
  if (Array.isArray(node)) return node.map(child => find(child, id)).find(Boolean);
  if (node && typeof node === 'object') {
    return node.props?.testID === id ? node : find(node.props?.children, id);
  }
}

test('a restored active session opens without credential or biometric prompts when the lock is off', async () => {
  const gate = await mountGate({ age: 24 * 60 * 60 * 1000 });
  assert.match(JSON.stringify(gate.tree), /private-content/);
  assert.equal(gate.signOuts, 0);
  assert.equal(gate.prompts, 0);
});

test('a 30-day inactive restored session signs out, but a newly authenticated session starts fresh', async () => {
  const expired = await mountGate({ age: SESSION_INACTIVITY_TIMEOUT_MS });
  assert.equal(expired.signOuts, 1);
  assert.ok(find(expired.tree, 'session-inactivity-sign-in'));
  const fresh = await mountGate({ age: SESSION_INACTIVITY_TIMEOUT_MS, sessionId: 'fresh_session' });
  assert.equal(fresh.signOuts, 0);
  assert.match(JSON.stringify(fresh.tree), /private-content/);
});

test('a paused heartbeat cannot overwrite the old activity timestamp before a long-background resume check', async () => {
  const gate = await mountGate();
  gate.emit('background');
  await gate.settle();
  const before = await gate.store.getLastActiveAt('user_one', 'session_one');
  gate.advance(SESSION_INACTIVITY_TIMEOUT_MS);
  gate.appState.currentState = 'active';
  gate.tick();
  await gate.settle();
  assert.equal(await gate.store.getLastActiveAt('user_one', 'session_one'), before);
  gate.emit('active');
  await gate.settle();
  assert.equal(gate.signOuts, 1);
});

test('cancelled Face ID keeps private content hidden, and retry opens only after successful authentication', async () => {
  const gate = await mountGate({ biometric: true, results: [{ success: false }, { success: true }] });
  assert.doesNotMatch(JSON.stringify(gate.tree), /private-content/);
  assert.equal(gate.prompts, 1);
  await find(gate.tree, 'session-biometric-retry').props.onPress();
  await gate.settle();
  assert.match(JSON.stringify(gate.tree), /private-content/);
  assert.equal(gate.prompts, 2);
  assert.equal(gate.signOuts, 0);
});

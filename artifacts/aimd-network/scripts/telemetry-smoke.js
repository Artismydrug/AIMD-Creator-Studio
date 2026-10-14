const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function loadTelemetry(platform, { development = false, configured = true, throws = false, importThrows = false, constructorThrows = false, readyThrows = false, handlerThrows = false } = {}) {
  const events = [], logs = [], listeners = {}, previousErrors = [];
  let options, globalHandler = (...args) => previousErrors.push(args), instances = 0;
  const capture = (event, properties) => {
    if (throws) throw new Error('Network unavailable');
    const filtered = options.before_send({
      event,
      properties: { distinct_id: 'anonymous-test', $current_url: 'https://example.test/?private=yes', email: 'private@example.test', ...properties },
    });
    if (filtered) events.push(filtered);
  };
  class MockNative {
    constructor(_token, config) {
      if (constructorThrows) throw new Error('PRIVATE_INIT_DETAIL');
      options = config; instances++;
    }
    async ready() { if (readyThrows) throw new Error('PRIVATE_INIT_DETAIL'); }
    capture(...args) { capture(...args); }
  }
  const mockWeb = { init: (_token, config) => { options = config; instances++; }, capture };
  const file = platform === 'native'
    ? '../lib/telemetry.ts'
    : '../../aimd-academy/src/lib/telemetry.ts';
  const source = readFileSync(resolve(__dirname, file), 'utf8').replaceAll('import.meta.env', '__ENV__');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const sandbox = {
    exports: {}, Error, Date, WeakSet, Set,
    __DEV__: development,
    __ENV__: { PROD: !development, DEV: development, VITE_POSTHOG_PROJECT_TOKEN: configured ? 'phc_fixture' : '' },
    process: { env: { EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN: configured ? 'phc_fixture' : '' } },
    console: { warn: (...args) => logs.push(args), error: (...args) => logs.push(args) },
    window: { addEventListener: (name, callback) => { listeners[name] = callback; } },
    ErrorUtils: {
      getGlobalHandler: () => {
        if (handlerThrows) throw new Error('PRIVATE_INIT_DETAIL');
        return globalHandler;
      },
      setGlobalHandler: (callback) => { globalHandler = callback; },
    },
    require: (name) => {
      if (name === 'posthog-react-native') {
        if (importThrows) throw new Error('SDK unavailable');
        return MockNative;
      }
      if (name === 'posthog-js') return { __esModule: true, default: mockWeb };
      if (name === 'react-native') return { Platform: { OS: 'ios' } };
      throw new Error(`Unexpected dependency ${name}`);
    },
  };
  vm.runInNewContext(code, sandbox);
  return { api: sandbox.exports, events, logs, listeners, previousErrors, options: () => options, instances: () => instances, errorHandler: (...args) => globalHandler(...args) };
}

for (const platform of ['native', 'web']) {
  test(`${platform}: startup emits one app_open and disables invasive capture`, async () => {
    const app = loadTelemetry(platform);
    const first = app.api.startTelemetry();
    const second = app.api.startTelemetry();
    assert.equal(first, second);
    if (platform === 'native') {
      assert.equal(app.instances(), 0, 'native SDK loading must be asynchronous');
    }
    await first;
    assert.equal(app.instances(), 1);
    assert.equal(app.events.filter(event => event.event === 'app_open').length, 1);
    const options = app.options();
    assert.equal(platform === 'native' ? options.enableSessionReplay : !options.disable_session_recording, false);
    assert.equal(platform === 'native' ? options.captureAppLifecycleEvents : options.autocapture, false);
    assert.equal(options.before_send({ event: '$autocapture', properties: {} }), null);
  });
  test(`${platform}: outgoing events exclude content, URLs, identity and person profiles`, async () => {
    const app = loadTelemetry(platform);
    await app.api.startTelemetry();
    app.api.trackEvent('habit_logged', { caption: 'private', reflection: 'private', message: 'private', token: 'private', email: 'private' });
    const props = app.events.at(-1).properties;
    for (const key of ['caption', 'reflection', 'message', 'token', 'email', '$current_url']) assert.equal(key in props, false);
    assert.equal(props.$process_person_profile, false);
    assert.equal(props.$geoip_disable, true);
  });
  test(`${platform}: missing configuration and development never send events`, async () => {
    for (const settings of [{ configured: false }, { development: true }]) {
      const app = loadTelemetry(platform, settings);
      await app.api.startTelemetry(); app.api.trackEvent('habit_logged');
      assert.equal(app.instances(), 0); assert.equal(app.events.length, 0);
      if (settings.configured === false) assert.equal(app.logs.length, 1);
    }
  });
  test(`${platform}: errors are classified, deduplicated and rate limited without private messages`, async () => {
    const app = loadTelemetry(platform);
    await app.api.startTelemetry();
    const error = new Error('PRIVATE_CONTENT');
    error.name = 'TypeError';
    app.api.reportException(error, 'render');
    app.api.reportException(error, 'render');
    assert.equal(app.events.filter(event => event.event === 'app_exception').length, 1);
    assert.equal(app.events.at(-1).properties.error_type, 'TypeError');
    assert.equal(JSON.stringify(app.events).includes('PRIVATE_CONTENT'), false);
    assert.equal(JSON.stringify(app.logs).includes('PRIVATE_CONTENT'), false);
    for (let i = 0; i < 25; i++) app.api.reportException(new Error('PRIVATE_CONTENT'), 'runtime', false);
    assert.equal(app.events.filter(event => event.event === 'app_exception').length, 10);
  });
  test(`${platform}: failed analytics requests do not break user actions`, async () => {
    const app = loadTelemetry(platform, { throws: true });
    await assert.doesNotReject(async () => { await app.api.startTelemetry(); app.api.trackEvent('habit_logged'); app.api.reportException(new Error('private'), 'render'); });
  });
}

test('native: preserve the previous runtime crash handler', async () => {
  const app = loadTelemetry('native');
  await app.api.startTelemetry();
  const error = new Error('private');
  app.errorHandler(error, true);
  assert.equal(app.previousErrors.length, 1);
  assert.equal(app.previousErrors[0][0], error);
  assert.equal(app.previousErrors[0][1], true);
  assert.equal(app.events.at(-1).properties.handled, false);
});

test('web: listen for uncaught errors and promise rejections', async () => {
  const app = loadTelemetry('web');
  await app.api.startTelemetry();
  app.listeners.error({ error: new Error('private') });
  app.listeners.unhandledrejection({ reason: new Error('private') });
  assert.equal(app.events.filter(event => event.event === 'app_exception').length, 2);
});

test('native: an SDK import failure is contained and leaves the crash handler intact', async () => {
  const app = loadTelemetry('native', { importThrows: true });
  await assert.doesNotReject(() => app.api.startTelemetry());
  assert.equal(app.instances(), 0);
  assert.equal(app.events.filter(event => event.event === 'app_open').length, 0);
  assert.equal(app.logs.some(args => String(args[0]).includes('could not initialize')), true);
  assert.doesNotThrow(() => app.errorHandler(new Error('private'), true));
  assert.equal(app.previousErrors.length, 1);
});

for (const settings of [{ constructorThrows: true }, { readyThrows: true }]) {
  test(`native: ${Object.keys(settings)[0]} does not reject or expose initialization details`, async () => {
    const app = loadTelemetry('native', settings);
    await assert.doesNotReject(() => app.api.startTelemetry());
    assert.equal(app.events.length, 0);
    assert.equal(JSON.stringify(app.logs).includes('PRIVATE_INIT_DETAIL'), false);
    app.errorHandler(new Error('private'), true);
    assert.equal(app.previousErrors.length, 1);
  });
}
test('native: optional error-hook setup failure cannot reject startup', async () => {
  const app = loadTelemetry('native', { handlerThrows: true });
  await assert.doesNotReject(() => app.api.startTelemetry());
  assert.equal(JSON.stringify(app.logs).includes('PRIVATE_INIT_DETAIL'), false);
  assert.equal(app.events.filter(event => event.event === 'app_open').length, 1);
});

test('root layout schedules telemetry only from the mounted navigation lifecycle', () => {
  const source = readFileSync(resolve(__dirname, '../app/_layout.tsx'), 'utf8');
  assert.match(source, /function TelemetryLifecycle\(\)[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?startTelemetry\(\)/);
  const nav = source.slice(source.indexOf('function RootLayoutNav()'), source.indexOf('function TelemetryLifecycle()'));
  assert.match(nav, /<TelemetryLifecycle\s*\/>/);
  const root = source.slice(source.indexOf('export default function RootLayout()'));
  assert.doesNotMatch(root, /startTelemetry\(\)/);
});

test('navigation telemetry effect delays startup and cancels the timer on unmount', () => {
  const source = readFileSync(resolve(__dirname, '../app/_layout.tsx'), 'utf8');
  const lifecycle = source.slice(source.indexOf('function TelemetryLifecycle()'), source.indexOf('function ThemedApp()'));
  let effect, timerCallback, delay, starts = 0, cleared = 0;
  const sandbox = {
    useEffect: callback => { effect = callback; },
    setTimeout: (callback, ms) => { timerCallback = callback; delay = ms; return 1; },
    clearTimeout: () => { cleared++; },
    startTelemetry: async () => { starts++; },
  };
  vm.runInNewContext(`${lifecycle}\nTelemetryLifecycle();`, sandbox);
  assert.equal(starts, 0, 'render cannot initialize the SDK');
  const cleanup = effect();
  assert.equal(starts, 0, 'the first mount effect must not initialize immediately');
  assert.equal(delay, 1000);
  timerCallback();
  assert.equal(starts, 1);
  cleanup();
  assert.equal(cleared, 1);
  effect()();
  timerCallback();
  assert.equal(starts, 1, 'cancelled/Strict Mode mounts must not initialize');
});

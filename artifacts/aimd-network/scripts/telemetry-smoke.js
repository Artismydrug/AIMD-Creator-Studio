const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function loadTelemetry(platform, { development = false, configured = true, throws = false } = {}) {
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
    constructor(_token, config) { options = config; instances++; }
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
      getGlobalHandler: () => globalHandler,
      setGlobalHandler: (callback) => { globalHandler = callback; },
    },
    require: (name) => {
      if (name === 'posthog-react-native') return MockNative;
      if (name === 'posthog-js') return { __esModule: true, default: mockWeb };
      if (name === 'react-native') return { Platform: { OS: 'ios' } };
      throw new Error(`Unexpected dependency ${name}`);
    },
  };
  vm.runInNewContext(code, sandbox);
  return { api: sandbox.exports, events, logs, listeners, previousErrors, options: () => options, instances: () => instances, errorHandler: (...args) => globalHandler(...args) };
}

for (const platform of ['native', 'web']) {
  test(`${platform}: startup emits one app_open and disables invasive capture`, () => {
    const app = loadTelemetry(platform);
    app.api.startTelemetry(); app.api.startTelemetry();
    assert.equal(app.instances(), 1);
    assert.equal(app.events.filter(event => event.event === 'app_open').length, 1);
    const options = app.options();
    assert.equal(platform === 'native' ? options.enableSessionReplay : !options.disable_session_recording, false);
    assert.equal(platform === 'native' ? options.captureAppLifecycleEvents : options.autocapture, false);
    assert.equal(options.before_send({ event: '$autocapture', properties: {} }), null);
  });
  test(`${platform}: outgoing events exclude content, URLs, identity and person profiles`, () => {
    const app = loadTelemetry(platform);
    app.api.startTelemetry();
    app.api.trackEvent('habit_logged', { caption: 'private', reflection: 'private', message: 'private', token: 'private', email: 'private' });
    const props = app.events.at(-1).properties;
    for (const key of ['caption', 'reflection', 'message', 'token', 'email', '$current_url']) assert.equal(key in props, false);
    assert.equal(props.$process_person_profile, false);
    assert.equal(props.$geoip_disable, true);
  });
  test(`${platform}: missing configuration and development never send events`, () => {
    for (const settings of [{ configured: false }, { development: true }]) {
      const app = loadTelemetry(platform, settings);
      app.api.startTelemetry(); app.api.trackEvent('habit_logged');
      assert.equal(app.instances(), 0); assert.equal(app.events.length, 0);
      if (settings.configured === false) assert.equal(app.logs.length, 1);
    }
  });
  test(`${platform}: errors are classified, deduplicated and rate limited without private messages`, () => {
    const app = loadTelemetry(platform);
    app.api.startTelemetry();
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
  test(`${platform}: failed analytics requests do not break user actions`, () => {
    const app = loadTelemetry(platform, { throws: true });
    assert.doesNotThrow(() => { app.api.startTelemetry(); app.api.trackEvent('habit_logged'); app.api.reportException(new Error('private'), 'render'); });
  });
}

test('native: preserve the previous runtime crash handler', () => {
  const app = loadTelemetry('native');
  app.api.startTelemetry();
  const error = new Error('private');
  app.errorHandler(error, true);
  assert.equal(app.previousErrors.length, 1);
  assert.equal(app.previousErrors[0][0], error);
  assert.equal(app.previousErrors[0][1], true);
  assert.equal(app.events.at(-1).properties.handled, false);
});

test('web: listen for uncaught errors and promise rejections', () => {
  const app = loadTelemetry('web');
  app.api.startTelemetry();
  app.listeners.error({ error: new Error('private') });
  app.listeners.unhandledrejection({ reason: new Error('private') });
  assert.equal(app.events.filter(event => event.event === 'app_exception').length, 2);
});

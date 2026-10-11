// Exercise the actual shared transport and submission guard without a browser
// or database. Transpile in memory so this check creates no build artifacts.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { test, afterEach } = require('node:test');
const ts = require('typescript');

function loadTypeScript(file) {
  const filename = path.resolve(__dirname, file);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = module.paths;
  loaded._compile(compiled, filename);
  return loaded.exports;
}

const { customFetch, setAuthTokenGetter, setBaseUrl, ApiError } =
  loadTypeScript('../../../lib/api-client-react/src/custom-fetch.ts');
const { runExclusiveSubmission } = loadTypeScript('../lib/submissionLock.ts');
const originalFetch = global.fetch;
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const never = () => new Promise(() => {});
const ok = () => new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } });

afterEach(() => {
  global.fetch = originalFetch;
  global.setTimeout = originalSetTimeout;
  global.clearTimeout = originalClearTimeout;
  setAuthTokenGetter(null);
  setBaseUrl(null);
});

test('successful JSON request preserves base URL, token and custom headers', async () => {
  setBaseUrl('https://example.test/');
  setAuthTokenGetter(() => 'test-token');
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://example.test/api/items');
    assert.equal(options.headers.get('authorization'), 'Bearer test-token');
    assert.equal(options.headers.get('x-test'), 'yes');
    return ok();
  };
  assert.deepEqual(await customFetch('/api/items', { headers: { 'X-Test': 'yes' } }), { ok: true });
});

test('explicit authorization bypasses the token getter', async () => {
  setAuthTokenGetter(() => { throw new Error('must not acquire token'); });
  global.fetch = async () => ok();
  await customFetch('/api/items', { headers: { Authorization: 'Bearer explicit' } });
});

test('GET with a body remains rejected before fetch', async () => {
  global.fetch = () => { throw new Error('must not fetch'); };
  await assert.rejects(customFetch('/api/items', { body: '{}' }), TypeError);
});

test('ordinary requests have a 30-second deadline and clean up their timer', async () => {
  const delays = [];
  const cleared = [];
  global.setTimeout = (fn, delay) => { delays.push(delay); return originalSetTimeout(fn, delay); };
  global.clearTimeout = (timer) => { cleared.push(timer); originalClearTimeout(timer); };
  global.fetch = async () => ok();
  await customFetch('/api/items');
  assert.deepEqual(delays, [30_000]);
  assert.equal(cleared.length, 1);
});

test('binary media gets a separate three-minute deadline', async () => {
  const delays = [];
  global.setTimeout = (fn, delay) => { delays.push(delay); return originalSetTimeout(fn, delay); };
  global.fetch = async () => ok();
  await customFetch('/api/storage/uploads', { method: 'POST', body: new ArrayBuffer(8) });
  assert.deepEqual(delays, [180_000]);
});

test('zero explicitly disables the deadline', async () => {
  global.setTimeout = () => { throw new Error('must not set a timer'); };
  global.fetch = async () => ok();
  await customFetch('/api/items', { timeoutMs: 0 });
});

test('hung fetch rejects on deadline even if fetch ignores abort', async () => {
  let signal;
  global.fetch = (_, options) => { signal = options.signal; return never(); };
  await assert.rejects(customFetch('/api/items', { timeoutMs: 15 }), /timed out after 15ms/);
  assert.equal(signal.aborted, true);
});

test('deadline covers token acquisition and prevents a late request', async () => {
  let resolveToken;
  let calls = 0;
  setAuthTokenGetter(() => new Promise((resolve) => { resolveToken = resolve; }));
  global.fetch = async () => { calls++; return ok(); };
  await assert.rejects(customFetch('/api/items', { timeoutMs: 15 }), /timed out/);
  resolveToken('late-token');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 0);
});

test('deadline covers a stalled successful response body', async () => {
  const response = ok();
  response.text = never;
  global.fetch = async () => response;
  await assert.rejects(customFetch('/api/items', { timeoutMs: 15 }), /timed out/);
});

test('deadline covers a stalled error response body', async () => {
  const response = new Response('busy', { status: 503 });
  response.text = never;
  global.fetch = async () => response;
  await assert.rejects(customFetch('/api/items', { timeoutMs: 15 }), /timed out/);
});

test('HTTP error preserves ApiError and the status code', async () => {
  global.fetch = async () => new Response('{"message":"Temporarily busy"}', {
    status: 503, headers: { 'content-type': 'application/json' },
  });
  await assert.rejects(customFetch('/api/items'), (error) => {
    assert(error instanceof ApiError);
    assert.equal(error.status, 503);
    return true;
  });
});

test('already-aborted caller never acquires auth or fetches', async () => {
  const controller = new AbortController();
  controller.abort();
  setAuthTokenGetter(() => { throw new Error('must not acquire auth'); });
  global.fetch = () => { throw new Error('must not fetch'); };
  await assert.rejects(customFetch('/api/items', { signal: controller.signal }), { name: 'AbortError' });
});

test('Request object cancellation is preserved without an options signal', async () => {
  const controller = new AbortController();
  controller.abort();
  global.fetch = () => { throw new Error('must not fetch'); };
  const request = new Request('https://example.test/items', { signal: controller.signal });
  await assert.rejects(customFetch(request), { name: 'AbortError' });
});

test('caller cancellation rejects a stalled response immediately', async () => {
  const controller = new AbortController();
  global.fetch = never;
  const pending = customFetch('/api/items', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
});

test('completed requests remove the caller abort listener', async () => {
  const controller = new AbortController();
  const remove = controller.signal.removeEventListener.bind(controller.signal);
  let removed = 0;
  controller.signal.removeEventListener = (...args) => { removed++; remove(...args); };
  global.fetch = async () => ok();
  await customFetch('/api/items', { signal: controller.signal });
  assert.equal(removed, 1);
});

test('rapid repeated submissions execute only once until completion', async () => {
  const lock = { current: false };
  let finish;
  let calls = 0;
  const first = runExclusiveSubmission(lock, () => {
    calls++;
    return new Promise((resolve) => { finish = resolve; });
  });
  assert.equal(await runExclusiveSubmission(lock, async () => { calls++; }), false);
  assert.equal(calls, 1);
  finish();
  assert.equal(await first, true);
  assert.equal(lock.current, false);
  assert.equal(await runExclusiveSubmission(lock, async () => { calls++; }), true);
  assert.equal(calls, 2);
});

test('failed submission releases its lock for an intentional retry', async () => {
  const lock = { current: false };
  await assert.rejects(runExclusiveSubmission(lock, async () => { throw new Error('offline'); }), /offline/);
  assert.equal(lock.current, false);
  assert.equal(await runExclusiveSubmission(lock, async () => {}), true);
});

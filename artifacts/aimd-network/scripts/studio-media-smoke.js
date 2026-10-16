const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

const compiled = ts.transpileModule(readFileSync(resolve(__dirname, '../lib/studioMedia.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness({ platform = 'ios', size = 1000, token = 'fixture-token', status = 200, body = '{"objectPath":"/objects/upload"}', neverFinishes = false } = {}) {
  const uploads = [], deleted = [], conversions = [], statuses = [];
  let timeout, cancels = 0, fetches = 0, rejectTransfer;
  const fs = {
    FileSystemUploadType: { BINARY_CONTENT: 0 },
    FileSystemSessionType: { FOREGROUND: 1 },
    getInfoAsync: async () => ({ exists: true, isDirectory: false, size }),
    deleteAsync: async uri => { deleted.push(uri); },
    createUploadTask(url, uri, options, onProgress) {
      uploads.push({ url, uri, options });
      return {
        uploadAsync: async () => {
          onProgress({ totalBytesSent: 5, totalBytesExpectedToSend: 10 });
          onProgress({ totalBytesSent: 10, totalBytesExpectedToSend: 10 });
          if (neverFinishes) return new Promise((_, reject) => { rejectTransfer = reject; });
          return { status, body };
        },
        cancelAsync: async () => {
          cancels++;
          rejectTransfer?.(new Error('Cancelled'));
        },
      };
    },
  };
  const sandbox = {
    exports: {},
    setTimeout: fn => { timeout = fn; return 1; },
    clearTimeout: () => {},
    fetch: async () => { fetches++; return { ok: true, blob: async () => ({ size, blob: true }) }; },
    require(name) {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-file-system/legacy') return fs;
      if (name === 'expo-image-manipulator') return {
        SaveFormat: { JPEG: 'jpeg' },
        manipulateAsync: async (...args) => { conversions.push(args); return { uri: 'file:///optimized.jpg' }; },
      };
      if (name === '@workspace/api-client-react') return {
        getBaseUrl: () => 'https://example.invalid',
        customFetch: async (url, options) => { uploads.push({ url, options }); return { objectPath: '/objects/web-upload' }; },
      };
      throw new Error(`Unexpected dependency ${name}`);
    },
  };
  vm.runInNewContext(compiled, sandbox);
  return {
    ...sandbox.exports, uploads, deleted, conversions, statuses,
    timeout: () => timeout(),
    cancels: () => cancels,
    fetches: () => fetches,
    send(type = 'video', extras = {}) {
      return sandbox.exports.uploadStudioMedia({
        uri: 'file:///original', contentType: type === 'image' ? 'image/heic' : 'video/mp4',
        mediaType: type, fileName: 'original', width: 3024, height: 4032, ...extras,
      }, async () => token, state => statuses.push(state));
    },
  };
}

test('9:16 frames fit phone, embedded, desktop and rotated viewports without overflowing', () => {
  const { portraitFrame } = harness();
  for (const [width, height] of [[390, 650], [390, 350], [1024, 700], [844, 390], [320, 480]]) {
    const frame = portraitFrame(width, height);
    assert.ok(Math.abs(frame.width / frame.height - 9 / 16) < 0.000001);
    assert.ok(frame.width <= width && frame.height <= height);
  }
  assert.ok(Number.isFinite(portraitFrame(NaN, Infinity).height));
});

test('photos are optimized within 1080 × 1920 without upscaling', () => {
  const { optimizedImageSize } = harness();
  for (const [width, height] of [[4032, 3024], [3024, 4032], [1080, 1920], [100, 200]]) {
    const result = optimizedImageSize(width, height);
    assert.ok(result.width <= 1080 && result.height <= 1920);
    assert.ok(result.width <= width && result.height <= height);
    assert.ok(Math.abs(result.width / result.height - width / height) < 0.01);
  }
  assert.equal(optimizedImageSize(0, 300), null);
});

test('native video transfers a file, not a JS ArrayBuffer, with real progress and the same privacy purpose', async () => {
  const h = harness();
  assert.equal(await h.send(), '/objects/upload');
  assert.equal(h.fetches(), 0);
  assert.equal(h.uploads.length, 1);
  assert.equal(h.uploads[0].uri, 'file:///original');
  assert.equal(h.uploads[0].options.headers.Authorization, 'Bearer fixture-token');
  assert.equal(h.uploads[0].options.headers['X-AIMD-UPLOAD-PURPOSE'], 'studio_post');
  assert.ok(h.statuses.some(s => s.phase === 'uploading' && s.progress === 0.5));
  assert.ok(h.statuses.some(s => s.phase === 'processing' && s.progress === 1));
  assert.equal(h.deleted.length, 0);
});

test('photo conversion changes only a temporary upload derivative and cleans it afterwards', async () => {
  const h = harness();
  await h.send('image');
  assert.equal(h.conversions.length, 1);
  assert.equal(h.uploads[0].uri, 'file:///optimized.jpg');
  assert.equal(h.uploads[0].options.headers['Content-Type'], 'image/jpeg');
  assert.deepEqual(h.deleted, ['file:///optimized.jpg']);
});

test('authentication and size failures cannot upload or delete the original', async () => {
  const unauthenticated = harness({ token: null });
  await assert.rejects(unauthenticated.send(), /sign in/);
  assert.equal(unauthenticated.uploads.length, 0);
  const oversized = harness({ size: 51 * 1024 * 1024 });
  await assert.rejects(oversized.send(), /50 MB/);
  assert.equal(oversized.uploads.length, 0);
  assert.equal(oversized.deleted.length, 0);
});

test('server media validation errors retain useful error messages and never retry', async () => {
  const h = harness({ status: 422, body: '{"error":"Video is corrupt"}' });
  await assert.rejects(h.send(), /Video is corrupt/);
  assert.equal(h.uploads.length, 1);
  const invalid = harness({ body: '{"objectPath":"https://untrusted.invalid/media"}' });
  await assert.rejects(invalid.send(), /could not be confirmed/);
});

test('native stalled transfers time out, cancel the native task, and keep drafts recoverable', async () => {
  const h = harness({ neverFinishes: true });
  const operation = h.send();
  for (let i = 0; i < 8; i++) await Promise.resolve();
  h.timeout();
  await assert.rejects(operation, /timed out.*draft/);
  assert.ok(h.cancels() >= 1);
  assert.equal(h.uploads.length, 1);
});

test('web fallback sends a Blob through the shared authenticated client, not an ArrayBuffer', async () => {
  const h = harness({ platform: 'web' });
  assert.equal(await h.send(), '/objects/web-upload');
  assert.equal(h.uploads[0].options.body.blob, true);
  assert.equal(h.uploads[0].options.headers['X-AIMD-UPLOAD-PURPOSE'], 'studio_post');
  assert.ok(h.statuses.some(s => s.phase === 'uploading' && s.progress === null));
});

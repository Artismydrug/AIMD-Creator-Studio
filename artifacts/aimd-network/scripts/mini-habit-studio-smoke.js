const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { test } = require('node:test');
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

const {
  createMiniHabitSketchbook,
  miniHabitSketchbookKey,
  MAX_MINI_HABIT_SKETCHES,
  MINI_HABIT_SKETCHBOOK_FULL,
} = loadTypeScript('../lib/miniHabitSketchbook.ts');

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      await new Promise((resolve) => setImmediate(resolve));
      values.set(key, value);
    },
    removeItem: async (key) => { values.delete(key); },
  };
}

function sketch(id, prompt = `Prompt ${id}`) {
  return { id, createdAt: '2026-10-18T20:00:00.000Z', prompt, paths: ['M10 10 L20 20'] };
}

test('Dashboard opens Side Quest and preserves the private 60-second sketch flow', () => {
  const dashboard = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
  const card = fs.readFileSync(path.resolve(__dirname, '../components/StickerJamPracticeCard.tsx'), 'utf8');
  const route = fs.readFileSync(path.resolve(__dirname, '../app/mini-habit-studio.tsx'), 'utf8');
  const habitsIndex = dashboard.indexOf('<HabitPracticeSummaryCard');
  const studioIndex = dashboard.indexOf('<StickerJamPracticeCard');
  assert.ok(studioIndex >= 0 && habitsIndex > studioIndex);
  assert.match(dashboard, /router\.push\('\/mini-habit-studio'\)/);
  assert.match(card, /TODAY’S PRACTICE/);
  assert.doesNotMatch(card, /CREATOR ARCADE/);
  assert.match(card, /testID="dashboard-canvas-carousel"/);
  assert.match(card, /pagingEnabled/);
  assert.match(card, /testID="dashboard-events-slide"/);
  assert.match(card, /onOpenEvents/);
  assert.match(dashboard, /const openEvents = useCallback\(\(\) => router\.push\('\/\(tabs\)\/events'\), \[router\]\)/);
  assert.match(dashboard, /onOpenEvents=\{openEvents\}/);
  assert.match(card, /Try Side Quest/);
  assert.match(route, />Side Quest</);
  assert.match(route, /const GAME_SECONDS = 60/);
  assert.match(route, /Math\.floor\(secondsLeft \/ 60\)/);
  assert.match(route, /PanResponder\.create/);
  assert.match(route, /miniHabitSketchbook\.save/);
  assert.match(route, /Private · No points or streaks · Sketches save on-device; photos and audio aren’t uploaded/);
  assert.match(route, /testID="mini-habit-sketch-done"/);
  assert.match(route, /onPress=\{\(\) => finishSketch\(true\)\}/);
  assert.match(route, /finishSketch\(\);/);
  assert.match(route, /setCompletionReason\(early \? 'early' : 'timeout'\)/);
  assert.match(route, /testID="mini-habit-sketch-next"/);
  assert.match(route, /Move to the next sketch idea/);
  assert.match(route, /Next challenge/);
  assert.match(route, /challenge\.input === 'text'/);
  assert.match(route, /challenge\.input === 'audio'/);
  assert.match(route, /requestRecordingPermissionsAsync/);
  assert.match(route, /launchImageLibraryAsync/);
  assert.doesNotMatch(route, /useSpinDailyReward|useCheckInProgress|trackEvent/);
});

test('all five mediums have tailored prompts and matching inputs without immediate repeats', () => {
  const { SIDE_QUEST_MEDIA, pickSideQuestPrompt } = loadTypeScript('../lib/sideQuestPrompts.ts');
  assert.deepEqual(SIDE_QUEST_MEDIA.map((medium) => medium.id), ['visual_art', 'fashion', 'music', 'poetry', 'movement']);
  assert.deepEqual(SIDE_QUEST_MEDIA.map((medium) => medium.input), ['canvas', 'photo', 'audio', 'text', 'photo']);
  for (const medium of SIDE_QUEST_MEDIA) {
    assert.ok(medium.prompts.length >= 4);
    const first = pickSideQuestPrompt(medium.id);
    const next = pickSideQuestPrompt(medium.id, first.id);
    assert.equal(next.medium, medium.id);
    assert.notEqual(next.id, first.id);
  }
  const originalRandom = Math.random;
  try {
    const seen = new Set();
    for (const value of [0, 0.2, 0.4, 0.6, 0.8]) {
      Math.random = () => value;
      seen.add(pickSideQuestPrompt('mixed').medium);
    }
    assert.equal(seen.size, 5);
  } finally { Math.random = originalRandom; }
});

test('concurrent local saves are serialized and isolated per signed-in account', async () => {
  const storage = memoryStorage();
  const store = createMiniHabitSketchbook(storage);
  await Promise.all([
    store.save('user-a', sketch('one')),
    store.save('user-a', sketch('two')),
    store.save('user-b', sketch('other')),
  ]);
  assert.deepEqual((await store.load('user-a')).map((item) => item.id), ['one', 'two']);
  assert.deepEqual((await store.load('user-b')).map((item) => item.id), ['other']);
  assert.deepEqual(
    (await createMiniHabitSketchbook(storage).load('user-a')).map((item) => item.id),
    ['one', 'two'],
  );
});

test('duplicate saves are idempotent, deleting removes local data, and account clearing is scoped', async () => {
  const storage = memoryStorage();
  const store = createMiniHabitSketchbook(storage);
  await store.save('user-a', sketch('one'));
  await store.save('user-a', sketch('one'));
  await store.save('user-b', sketch('other'));
  assert.equal((await store.load('user-a')).length, 1);
  assert.deepEqual(await store.remove('user-a', 'one'), []);
  await store.clearAccount('user-b');
  assert.deepEqual(await store.load('user-a'), []);
  assert.deepEqual(await store.load('user-b'), []);
});

test('sketchbook limit and malformed storage fail explicitly without dropping old sketches', async () => {
  const storage = memoryStorage();
  const store = createMiniHabitSketchbook(storage);
  const saved = Array.from({ length: MAX_MINI_HABIT_SKETCHES }, (_, index) => sketch(`s${index}`));
  await Promise.all(saved.map((item) => store.save('user-a', item)));
  await assert.rejects(store.save('user-a', sketch('overflow')), new RegExp(MINI_HABIT_SKETCHBOOK_FULL));
  assert.equal((await store.load('user-a')).length, MAX_MINI_HABIT_SKETCHES);
  await assert.rejects(Promise.resolve().then(() => miniHabitSketchbookKey('')), /Invalid sketchbook account/);
  storage.values.set(miniHabitSketchbookKey('user-corrupt'), '{"not":"an array"}');
  await assert.rejects(store.load('user-corrupt'), /Invalid saved sketchbook/);
});

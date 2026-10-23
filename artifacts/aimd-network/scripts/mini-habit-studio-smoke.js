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
const {
  CREATIVE_MEDIUMS,
  CREATIVE_MEDIUM_CONFIG,
  nextCreativePrompt,
} = loadTypeScript('../lib/creativeMicroChallenges.ts');

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

test('Dashboard leads with Today’s Habit and Coming Soon Workshops, while retaining the canvas and event slides', () => {
  const dashboard = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
  const card = fs.readFileSync(path.resolve(__dirname, '../components/StickerJamPracticeCard.tsx'), 'utf8');
  const route = fs.readFileSync(path.resolve(__dirname, '../app/mini-habit-studio.tsx'), 'utf8');
  const habitsIndex = dashboard.indexOf('<HabitPracticeSummaryCard');
  const studioIndex = dashboard.indexOf('<StickerJamPracticeCard');
  const habitsSummaryIndex = dashboard.indexOf('<HabitPracticeSummaryCard onOpenHabits');
  const canvasShortcutIndex = dashboard.indexOf('<YourCanvasCard');
  assert.ok(studioIndex >= 0 && habitsIndex > studioIndex);
  assert.ok(canvasShortcutIndex > habitsSummaryIndex, 'Your Canvas shortcut is at the bottom of the dashboard');
  assert.match(dashboard, /<YourCanvasCard onPress=\{\(\) => router\.push\('\/mini-habit-studio'\)\}/);
  assert.match(dashboard, /router\.push\('\/mini-habit-studio'\)/);
  assert.match(card, /TODAY’S PRACTICE/);
  assert.doesNotMatch(card, /CREATOR ARCADE/);
  assert.match(card, /testID="dashboard-canvas-carousel"/);
  assert.match(card, /Your Canvas/);
  assert.match(card, /pagingEnabled/);
  assert.match(card, /testID="dashboard-active-habit-slide"/);
  assert.match(card, /testID="dashboard-workshop-slide"/);
  assert.match(card, /COMING SOON/);
  assert.match(card, /testID="dashboard-events-slide"/);
  assert.ok(card.indexOf('testID="dashboard-active-habit-slide"') < card.indexOf('testID="dashboard-workshop-slide"'));
  assert.ok(card.indexOf('testID="dashboard-workshop-slide"') < card.indexOf('testID="dashboard-mini-habit-studio-open"'));
  assert.ok(card.indexOf('testID="dashboard-mini-habit-studio-open"') < card.indexOf('testID="dashboard-events-slide"'));
  assert.match(card, /workshop-preview\.jpg/);
  assert.match(card, /onOpenEvents/);
  assert.match(dashboard, /onOpenEvents=\{\(\) => router\.push\('\/\(tabs\)\/events'\)\}/);
  assert.match(card, /Start a sketch/);
  const canvasShortcut = fs.readFileSync(path.resolve(__dirname, '../components/YourCanvasCard.tsx'), 'utf8');
  assert.match(canvasShortcut, /testID="dashboard-your-canvas-card"/);
  assert.match(canvasShortcut, /marginTop: 24/);
  assert.match(canvasShortcut, /Your Canvas/);
  assert.match(canvasShortcut, /Start Flash Sketch/);
  assert.doesNotMatch(route, />Creator Arcade<|headerTitle/);
  assert.match(route, /testID="mini-habit-studio-back"/);
  assert.match(route, /<Text style=\{styles\.prompt\}>\{prompt\}<\/Text>/);
  assert.match(route, /const GAME_SECONDS = 60/);
  assert.match(route, /Math\.floor\(secondsLeft \/ 60\)/);
  assert.match(route, /PanResponder\.create/);
  assert.match(route, /miniHabitSketchbook\.save/);
  assert.match(route, /Sketches stay on this device/);
  assert.match(route, /testID="mini-habit-sketch-done"/);
  assert.match(route, /onPress=\{\(\) => finishSketch\(true\)\}/);
  assert.match(route, /finishSketch\(\);/);
  assert.match(route, /setCompletionReason\(early \? 'early' : 'timeout'\)/);
  assert.match(route, /testID="mini-habit-sketch-next"/);
  assert.match(route, /Move to the next sketch idea/);
  assert.match(route, /Next sketch idea/);
  assert.match(route, /scrollEnabled=\{!isDrawing\}/);
  assert.match(route, /onPanResponderTerminationRequest: \(\) => false/);
  assert.match(route, /onShouldBlockNativeResponder: \(\) => true/);
  assert.match(route, /pointerEvents="none"/);
  assert.match(route, /touchAction: 'none'/);
  assert.match(route, /status === 'playing' \|\| saving/);
  assert.ok(
    route.indexOf('testID="mini-habit-sketch-start"') < route.indexOf('testID="mini-habit-sketch-canvas"'),
    'Start is reachable before the drawing canvas is positioned for the locked session',
  );
  assert.doesNotMatch(route, /useSpinDailyReward|useCheckInProgress|trackEvent/);
});

test('one-minute creative challenges include visual art, music, fashion, poetry, and movement prompts', () => {
  assert.deepEqual(CREATIVE_MEDIUMS, ['visual', 'music', 'fashion', 'poetry', 'movement']);
  for (const medium of CREATIVE_MEDIUMS) {
    const config = CREATIVE_MEDIUM_CONFIG[medium];
    assert.ok(config.label.length > 0, `${medium} has a visible selector label`);
    assert.ok(config.title.length > 0, `${medium} has a challenge title`);
    assert.ok(config.prompts.length >= 2, `${medium} has a prompt rotation`);
    assert.notEqual(nextCreativePrompt(medium, config.prompts[0]), config.prompts[0], `${medium} can advance to another prompt`);
  }
});

test('each non-drawing challenge has a playable, goal-based interaction', () => {
  const screen = fs.readFileSync(path.resolve(__dirname, '../app/mini-habit-studio.tsx'), 'utf8');
  const games = fs.readFileSync(path.resolve(__dirname, '../components/CreativeMicroChallenge.tsx'), 'utf8');
  assert.match(screen, /medium=\{medium as NonVisualMedium\}/);
  assert.match(games, /testID=\{`micro-challenge-\$\{medium\}-active`\}/);
  for (const medium of ['music', 'fashion', 'poetry', 'movement']) {
    assert.ok(games.includes(`testID="micro-challenge-${medium}-finish"`), `${medium} has an explicit completion action`);
  }
  assert.match(games, /beatCount < 3/);
  assert.match(games, /palette\.length !== 3/);
  assert.match(games, /poemWords\.length !== 3/);
  assert.match(games, /movesDone\.length === MOVEMENT_SEQUENCE\.length/);
  assert.match(games, /No camera or activity tracking/);
  assert.match(games, /completionReason === 'timeout' \? 'Time’s up' : 'Challenge complete'/);
  assert.match(screen, /Creative warm-ups are for practice and do not change points or habit streaks/);
});

test('Habit and Workshop cards are full-bleed; Events uses an inset flyer over artwork', () => {
  const card = fs.readFileSync(path.resolve(__dirname, '../components/StickerJamPracticeCard.tsx'), 'utf8');
  const fullBleedImageUses = card.match(/style=\{styles\.fullBleedImage\}/g) ?? [];
  const fullBleedWashes = card.match(/style=\{styles\.fullBleedWash\}/g) ?? [];
  const habitStart = card.indexOf('testID="dashboard-active-habit-slide"');
  const habitEnd = card.indexOf('</TouchableOpacity>', habitStart);
  const habitSlide = card.slice(habitStart, habitEnd);
  const workshopStart = card.indexOf('testID="dashboard-workshop-slide"');
  const workshopEnd = card.indexOf('</TouchableOpacity>', workshopStart);
  const workshopSlide = card.slice(workshopStart, workshopEnd);
  const canvasStart = card.indexOf('<View style={styles.canvasFrame}>');
  const canvasEnd = card.indexOf('testID="dashboard-mini-habit-studio-open"', canvasStart);
  const canvasSlide = card.slice(canvasStart, canvasEnd);
  const eventStart = card.indexOf('testID="dashboard-events-slide"');
  const eventEnd = card.indexOf('</TouchableOpacity>', eventStart);
  const eventSlide = card.slice(eventStart, eventEnd);
  const slideArtwork = [
    'daily-habit-workspace.jpg',
    'workshop-preview.jpg',
    'sticker-jam-sketchbook.jpg',
    'aimd-events-market-backdrop.jpg',
  ];

  assert.equal(fullBleedImageUses.length, 2, 'habit and workshop artwork should fill their cards');
  assert.equal(fullBleedWashes.length, 2, 'full-bleed slides should have a contrast wash');
  assert.match(habitSlide, /daily-habit-workspace\.jpg/);
  assert.doesNotMatch(habitSlide, /sticker-jam-sketchbook\.jpg/);
  assert.match(workshopSlide, /workshop-preview\.jpg/);
  assert.match(canvasSlide, /sticker-jam-sketchbook\.jpg/);
  assert.match(eventSlide, /aimd-events-market-backdrop\.jpg/);
  assert.equal(new Set(slideArtwork).size, slideArtwork.length, 'each carousel slide should use distinct artwork');
  for (const image of slideArtwork) {
    assert.ok(fs.existsSync(path.resolve(__dirname, `../assets/images/${image}`)), `${image} should be bundled locally`);
  }
  assert.match(card, /canvasImage:\s*\{\s*width: '100%',\s*height: '100%/);
  assert.match(card, /source=\{require\('\.\.\/assets\/images\/sticker-jam-sketchbook\.jpg'\)\}[\s\S]{0,120}resizeMode="cover"/);
  assert.match(card, /source=\{require\('\.\.\/assets\/images\/workshop-preview\.jpg'\)\}[\s\S]{0,120}resizeMode="cover"/);
  assert.match(card, /eventsBackdropImage:[\s\S]*?position: 'absolute'[\s\S]*?width: '100%'[\s\S]*?height: '100%'/);
  assert.match(card, /eventsBackdropWash:[\s\S]*?backgroundColor: 'rgba\(249, 248, 246, 0\.76\)'/);
  assert.match(eventSlide, /style=\{styles\.eventsBackdropImage\}/);
  assert.match(eventSlide, /eventsPosterFrame/);
  assert.match(eventSlide, /source=\{require\('\.\.\/assets\/images\/los-feliz-flea-flyer\.jpg'\)\}[\s\S]{0,140}resizeMode="contain"/);
  assert.match(card, /habitContentPanel:[\s\S]*?backgroundColor: 'rgba\(249, 248, 246, 0\.91\)'/);
  assert.match(card, /workshopContentPanel:[\s\S]*?backgroundColor: 'rgba\(249, 248, 246, 0\.91\)'/);
  assert.match(card, /eventsInfoPanel:[\s\S]*?backgroundColor: 'rgba\(249, 248, 246, 0\.94\)'/);
  assert.doesNotMatch(card, /habitArtFrame|workshopArtFrame/);
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

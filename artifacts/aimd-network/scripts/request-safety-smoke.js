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
const { COMING_SOON_WORKSHOP_PREVIEWS } = loadTypeScript('../lib/workshopPreviews.ts');
const { draftAfterConfirmedSend } = loadTypeScript('../lib/messageDraft.ts');
const { createMessageDraftStore, messageDraftKey } = loadTypeScript('../lib/messageDraftStore.ts');
const { shouldScrollTextPost } = loadTypeScript('../lib/textPostLayout.ts');
const originalFetch = global.fetch;
const originalSetTimeout = global.setTimeout;
const originalClearTimeout = global.clearTimeout;
const never = () => new Promise(() => {});
const ok = () => new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } });

test('the compact dashboard points card opens a safe-area-aware Member Drops page with a back fallback', () => {
  const card = fs.readFileSync(path.resolve(__dirname, '../components/MonthlyMemberDrops.tsx'), 'utf8');
  const dashboard = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
  const page = fs.readFileSync(path.resolve(__dirname, '../app/rewards.tsx'), 'utf8');
  const compact = card.slice(card.indexOf('if (compact)'), card.indexOf('<View style={s.card} testID="monthly-member-drops">'));
  assert.match(dashboard, /<MonthlyMemberDrops compact/);
  assert.match(compact, /onPress=\{\(\) => router\.push\('\/rewards'\)\}/);
  assert.match(compact, /testID="open-monthly-member-drops"/);
  assert.doesNotMatch(compact, /s\.detail|drop\?\.title|Members can use their AIMD points/);
  assert.match(page, /useSafeAreaInsets/);
  assert.match(page, /insets\.top \+ 20/);
  assert.match(page, /headerCopy: \{ flex: 1, minWidth: 0 \}/);
  assert.match(page, /router\.canGoBack\(\) \? router\.back\(\) : router\.replace\('\/\(tabs\)'\)/);
});

test('creator suggestions, directory cards and feed authors open public creator studios', () => {
  const suggestions = fs.readFileSync(path.resolve(__dirname, '../components/FollowingFeedSuggestions.tsx'), 'utf8');
  const feed = fs.readFileSync(path.resolve(__dirname, '../app/feed.tsx'), 'utf8');
  const dashboard = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
  const directory = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/directory.tsx'), 'utf8');
  const postCard = fs.readFileSync(path.resolve(__dirname, '../components/PostCard.tsx'), 'utf8');
  const notifications = fs.readFileSync(path.resolve(__dirname, '../app/notifications.tsx'), 'utf8');
  assert.match(feed, /<FollowingFeedSuggestions currentUserId=\{me\?\.id\}/);
  assert.match(suggestions, /const FEATURED_HANDLE = 'ponchotheartist'/);
  assert.match(suggestions, /follow\.mutate\(\{ id: creator\.id \}/);
  assert.match(suggestions, /onPress=\{\(\) => followCreator\(creator\)\}/);
  assert.match(suggestions, /if \(lock\.current \|\| !enabled\) return/);
  assert.match(suggestions, /client\.setQueriesData<StudioPost\[\]>/);
  assert.match(suggestions, /client\.invalidateQueries\(\{ queryKey: \['\/api\/studio-posts'\] \}/);
  assert.match(suggestions, /client\.invalidateQueries\(\{ queryKey: getGetUserProfileQueryKey\(creator\.id\)/);
  assert.match(suggestions, /pathname: '\/creator\/\[creatorId\]'/);
  assert.match(dashboard, /onPress=\{\(\) => router\.push\('\/profile'\)\}/);
  assert.match(feed, /onPress=\{\(\) => router\.push\('\/profile'\)\}/);
  assert.match(directory, /pathname: '\/creator\/\[creatorId\]'/);
  assert.match(postCard, /pathname: '\/creator\/\[creatorId\]'/);
  assert.match(postCard, /open-creator-profile-\$\{post\.userId\}/);
  assert.doesNotMatch(notifications, /\/creator\/\[id\]/);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../app/creator/[creatorId].tsx')), true);
});

test('short writing leaves feed paging available; long writing can scroll in its own viewport', () => {
  assert.equal(shouldScrollTextPost(140, 400), false);
  assert.equal(shouldScrollTextPost(400.5, 400), false);
  assert.equal(shouldScrollTextPost(700, 400), true);
  assert.equal(shouldScrollTextPost(700, 0), false);
});

test('text-only posts render the full writing instead of a media placeholder', () => {
  const body = fs.readFileSync(path.resolve(__dirname, '../components/TextPostBody.tsx'), 'utf8');
  const card = fs.readFileSync(path.resolve(__dirname, '../components/PostCard.tsx'), 'utf8');
  assert.match(card, /<TextPostBody postId=\{post\.id\} caption=\{post\.caption\} tags=\{post\.tags\}/);
  assert.doesNotMatch(card, /Creator in progress|immersiveFallback|fallbackMark/);
  assert.match(body, /<Text style=\{styles\.writing\} selectable>\{caption\}<\/Text>/);
  assert.doesNotMatch(body, /numberOfLines/);
  assert.match(body, /color: colors\.foreground/);
  assert.match(body, /scrollEnabled=\{shouldScrollTextPost\(contentHeight, viewportHeight\)\}/);
});

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

test('an unpublished workshop catalog has exactly four distinct preview examples', () => {
  assert.equal(COMING_SOON_WORKSHOP_PREVIEWS.length, 4);
  assert.equal(new Set(COMING_SOON_WORKSHOP_PREVIEWS.map((preview) => preview.title)).size, 4);
  for (const preview of COMING_SOON_WORKSHOP_PREVIEWS) {
    assert(preview.category && preview.title && preview.description);
    assert.equal('id' in preview, false);
    assert.equal('previewVideoUrl' in preview, false);
    assert.equal('lessonVideoUrl' in preview, false);
  }
});

test('empty workshop catalog renders coming-soon artwork without enrollable cards', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/workshops.tsx'), 'utf8');
  const emptyBranch = source.split('!workshops?.length ? (')[1].split(') : workshops.slice(0, 4)')[0];
  assert(emptyBranch.includes('COMING_SOON_WORKSHOP_PREVIEWS.map'));
  assert(emptyBranch.includes('WorkshopPreviewPlaceholder'));
  assert(emptyBranch.includes('Video previews and full lessons aren’t available yet.'));
  assert.equal(emptyBranch.includes('Preview available — full access coming soon'), false);
  assert.equal(emptyBranch.includes('TouchableOpacity'), false);
  assert.equal(emptyBranch.includes('openLesson('), false);
});

test('locked lesson upgrade action is immediate and does not upsell unverified access', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../components/WorkshopLessonPlayer.tsx'), 'utf8');
  assert(source.includes('!accessUnavailable && (!hasFullAccess || gated) && !!onUpgrade'));
  assert(source.includes('>Unlock Full Access</Text>'));
  assert(source.indexOf('testID="lesson-upgrade"') < source.indexOf('<KeyboardAwareScrollViewCompat'));
  assert(source.includes('testID="lesson-access-retry"'));
  const workshops = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/workshops.tsx'), 'utf8');
  assert(workshops.includes("router.push('/membership')"));
  assert(workshops.includes('onUpgrade={() => { setSelectedLesson(null); upgrade(); }}'));
});

test('practice receipt is scoped to the submission confirmed by the server', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/workshops.tsx'), 'utf8');
  assert(source.includes('onSuccess: (_assignment, variables)'));
  assert(source.includes('setSubmissionReceived({ workshopId: variables.data.workshopId, moduleId: variables.data.moduleId })'));
  assert(source.includes('submissionReceived?.workshopId === selectedWorkshopId && submissionReceived?.moduleId === selectedModuleId'));
  assert(source.includes('testID="workshop-submission-received"'));
  const reflection = fs.readFileSync(path.resolve(__dirname, '../components/LessonReflectionForm.tsx'), 'utf8');
  assert(reflection.includes('>Reflection received</Text>'));
  assert(reflection.includes('Saved to your private learning portfolio.'));
});

test('instructor attribution uses workshop data rather than a fabricated teacher', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../components/InstructorAttribution.tsx'), 'utf8');
  assert(source.includes('`Taught by ${instructor}`'));
  assert(source.includes('Instructor to be announced'));
  assert.equal(source.includes('ponchotheartist'), false);
  const workshops = fs.readFileSync(path.resolve(__dirname, '../app/(tabs)/workshops.tsx'), 'utf8');
  assert(workshops.includes('instructorName={workshopDetail?.instructorName ?? selectedWorkshop?.instructorName}'));
});

test('the frosted tab bar reserves layout space for feed creator controls', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../components/FrostedTabBar.tsx'), 'utf8');
  assert.match(source, /blur:\s*\{\s*position: 'relative'/);
});

test('embedded feed rows use the actual scroll viewport instead of a screen estimate', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/feed.tsx'), 'utf8');
  assert(source.includes('getNativeScrollRef();'));
  assert(source.includes('pagerViewportRef.current?.measure(onMeasured)'));
  assert(source.includes('onLayout={(event) => syncPagerHeight(event.nativeEvent.layout.height)}'));
  assert(source.includes('event.nativeEvent.layoutMeasurement.height'));
  assert(source.includes('setPagerHeight((previous) => previous === nextHeight ? previous : nextHeight)'));
});

test('portrait media keeps its measured height instead of collapsing to a zero CSS flex basis', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../components/PostCard.tsx'), 'utf8');
  assert.match(source, /portraitSurface:\s*\{\s*(?:\/\/[^\n]*\n\s*)*flexGrow: 0,\s*flexShrink: 0,\s*flexBasis: 'auto'/);
  assert(source.includes('[s.portraitSurface, mediaFrame]'));
  assert.equal(source.includes('{ flex: 0, ...mediaFrame }'), false);
});

test('All feed defaults to community-wide posts and refreshes on focus without cancelling in-flight reads', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/feed.tsx'), 'utf8');
  assert(source.includes("useState<'all' | 'following'>('all')"));
  assert(source.includes("followingOnly: feedMode === 'following' ? 'true' : 'false'"));
  assert(source.includes('useFocusEffect(useCallback'));
  assert(source.includes('void refetch({ cancelRefetch: false })'));
});

test('a confirmed message clears only the unchanged sent draft', () => {
  assert.equal(draftAfterConfirmedSend('Hey there', 'Hey there'), '');
  assert.equal(draftAfterConfirmedSend('A new message', 'Hey there'), 'A new message');
});

test('message composer compensates for the native stack header and keeps drafts until success', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../app/conversation/[id].tsx'), 'utf8');
  assert(source.includes("Platform.OS === 'web' ? 0 : headerHeight"));
  assert(source.includes("headerBackButtonDisplayMode: 'minimal'"));
  assert(source.includes('runExclusiveSubmission(sendingRef'));
  assert(source.indexOf('await sendMutation.mutateAsync') < source.indexOf('await draft.confirmSend(sent)'));
  assert(source.includes('await queryClient.cancelQueries({ queryKey })'));
  assert(source.includes('clientRequestId: sent.clientRequestId'));
  assert(source.includes('Could not confirm delivery'));
  assert(source.includes('refetchInterval: focused ? 5000 : false'));
});

function memoryDraftStorage() {
  const values = new Map();
  return {
    values,
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { await new Promise(resolve => setImmediate(resolve)); values.set(key, value); },
    removeItem: async key => { values.delete(key); },
  };
}

test('draft writes and reads are ordered; account/conversation storage stays isolated', async () => {
  const storage = memoryDraftStorage();
  const store = createMessageDraftStore(storage);
  const key = messageDraftKey(1, 2);
  await Promise.all([store.saveText(key, 'first'), store.saveText(key, 'newest')]);
  assert.equal((await store.load(key)).text, 'newest');
  assert.equal((await store.load(messageDraftKey(2, 2))).text, '');
  assert.equal((await store.load(messageDraftKey(1, 3))).text, '');
  assert.equal((await createMessageDraftStore(storage).load(key)).text, 'newest');
});

test('retry identity survives remount; late success preserves newer typing', async () => {
  const storage = memoryDraftStorage();
  let store = createMessageDraftStore(storage);
  const sent = await store.prepareSend('draft', ' Hello ', () => 'send-one');
  store = createMessageDraftStore(storage);
  const retry = await store.prepareSend('draft', ' Hello ', () => 'must-not-change');
  assert.equal(retry.clientRequestId, sent.clientRequestId);
  await store.saveText('draft', 'My next message');
  await store.confirmSend('draft', sent.clientRequestId, sent.text, sent.editVersion);
  assert.equal((await store.load('draft')).text, 'My next message');
});

test('simultaneous preparation shares one identity; confirmed unchanged drafts clear', async () => {
  const storage = memoryDraftStorage();
  const store = createMessageDraftStore(storage);
  const [first, second] = await Promise.all([
    store.prepareSend('draft', 'Hello', () => 'first'),
    store.prepareSend('draft', 'Hello', () => 'second'),
  ]);
  assert.equal(first.clientRequestId, second.clientRequestId);
  await store.confirmSend('draft', first.clientRequestId, first.text, first.editVersion);
  assert.equal(storage.values.has('draft'), false);
  const next = await store.prepareSend('draft', 'Hello', () => 'intentional-new-send');
  assert.equal(next.clientRequestId, 'intentional-new-send');
});

test('editing and restoring the same text during a send does not erase the newer draft', async () => {
  const store = createMessageDraftStore(memoryDraftStorage());
  const sent = await store.prepareSend('draft', 'Hello', () => 'one');
  await store.saveText('draft', 'Hello again');
  await store.saveText('draft', 'Hello');
  assert.equal(await store.confirmSend('draft', sent.clientRequestId, sent.text, sent.editVersion), false);
  assert.equal((await store.load('draft')).text, 'Hello');
});

test('failed persistence prevents sending and does not poison the storage queue', async () => {
  const storage = memoryDraftStorage();
  const store = createMessageDraftStore(storage);
  const save = storage.setItem;
  storage.setItem = async () => { throw new Error('device storage unavailable'); };
  await assert.rejects(store.prepareSend('draft', 'Hello', () => 'one'), /storage unavailable/);
  storage.setItem = save;
  assert.equal((await store.prepareSend('draft', 'Hello', () => 'two')).clientRequestId, 'two');
});

test('feed scopes reuse access-controlled learning/practice views and separate writing from media', () => {
  const feed = fs.readFileSync(path.resolve(__dirname, '../app/feed.tsx'), 'utf8');
  const scope = fs.readFileSync(path.resolve(__dirname, '../components/FeedScopeTabs.tsx'), 'utf8');
  const card = fs.readFileSync(path.resolve(__dirname, '../components/PostCard.tsx'), 'utf8');
  assert.match(feed, /<WorkshopsScreen embedded/);
  assert.match(feed, /<ChallengesScreen embedded/);
  assert.match(feed, /enabled: scope === 'community'/);
  assert.match(scope, /accessibilityState=\{\{ selected: scope === item.value \}\}/);
  assert.match(card, /if \(typeof url !== 'string' \|\| !url.trim\(\)\) return null/);
  assert.match(card, /script-post-card-/);
  assert.match(card, /Script & writing/);
});

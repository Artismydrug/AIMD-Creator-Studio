const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

const source = path => readFileSync(resolve(__dirname, path), 'utf8');
const jsx = (type, props) => ({ type, props });
function mount(path, dependencies, props = {}) {
  const states = [], effects = [], refs = [];
  let cursor = 0, refCursor = 0, tree;
  const react = {
    useState(value) {
      const i = cursor++;
      if (!(i in states)) states[i] = value;
      return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
    },
    useRef(value) { const i = refCursor++; return refs[i] ||= { current: value }; },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: fn => effects.push(fn),
  };
  const sandbox = {
    exports: {}, Error, __DEV__: false,
    require(name) {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (name in dependencies) return dependencies[name];
      throw new Error(`Unexpected module ${name}`);
    },
  };
  vm.runInNewContext(ts.transpileModule(source(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, sandbox);
  function render() {
    cursor = refCursor = 0;
    effects.length = 0;
    tree = (sandbox.exports.default || sandbox.exports.ErrorFallback)(props);
    return tree;
  }
  render();
  return { render, effects, get tree() { return tree; } };
}
function find(node, match) {
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, match); if (result) return result; }
  } else if (node && typeof node === 'object') {
    return match(node) ? node : find(node.props?.children, match);
  }
}
const native = {
  ...Object.fromEntries(['View', 'ScrollView', 'Text', 'Pressable', 'Modal', 'TouchableOpacity', 'ActivityIndicator', 'RefreshControl'].map(name => [name, name])),
  StyleSheet: { create: value => value, absoluteFill: {}, absoluteFillObject: {} },
  Platform: { select: value => value.ios },
};

test('all five main routes recover locally with stable whitelisted stages', () => {
  const expected = { index: 'DASHBOARD', community: 'FEED', feed: 'FEED', 'challenge-habits': 'HABITS', workshops: 'WORKSHOPS', 'learning-portfolio': 'PORTFOLIO' };
  for (const [routeName, stage] of Object.entries(expected)) {
    const result = mount('../components/ScreenErrorBoundary.tsx', {
      '@/components/ErrorBoundary': { ErrorBoundary: 'Boundary' },
      '@/components/ErrorFallback': { ErrorFallback: 'Fallback' },
    }, { routeName, children: 'screen' });
    assert.equal(result.tree.props.diagnosticStage, stage);
    assert.equal(result.tree.props.children, 'screen');
    const fallback = result.tree.props.FallbackComponent({ error: new TypeError('private') });
    assert.equal(fallback.props.recoverLocally, true);
  }
  for (const layout of ['../app/_layout.tsx', '../app/(tabs)/_layout.tsx']) {
    assert.match(source(layout), /screenLayout=.*ScreenErrorBoundary/);
  }
});

test('dashboard removes the Feed shortcut and keeps membership, Profile, and notifications accessible', () => {
  const dashboard = source('../app/(tabs)/index.tsx');
  assert.doesNotMatch(dashboard, /dashboard-feed-button/);
  assert.match(dashboard, /dashboard-membership-button/);
  assert.match(dashboard, /dashboard-profile-button/);
  assert.match(dashboard, /dashboard-notifications-button/);
  assert.match(dashboard, /router\.push\(isFreeCreator \? '\/membership' : '\/profile'\)/);
  assert.match(dashboard, /router\.push\('\/profile'\)/);
  assert.match(dashboard, /router\.push\('\/notifications'\)/);
  assert.match(dashboard, /memberProfileGroup/);
  assert.match(dashboard, /'Discovering Artist'/);
  assert.match(dashboard, /'Dedicated Artist'/);
  assert.match(dashboard, /'Professional Artist'/);
  assert.match(dashboard, /memberProfileGroup:\s*\{\s*flexDirection:\s*'column'/);
  assert.match(dashboard, /profileButton:\s*\{\s*minHeight:\s*44/);
  assert.match(dashboard, /fontSize:\s*13,\s*color:\s*colors\.primary/);
  assert.match(dashboard, /memberTierLabel:\s*\{[\s\S]*?translateY:\s*-10/);
  assert.match(dashboard, /headerActions:\s*\{[\s\S]*?gap:\s*0,[\s\S]*?translateY:\s*-4/);
  assert.match(dashboard, /header:\s*\{\s*paddingTop:\s*topPad,[\s\S]*?flexDirection:\s*'row',\s*alignItems:\s*'flex-start'/);
  assert.match(dashboard, /header:\s*\{\s*paddingTop:\s*topPad,\s*paddingHorizontal:\s*16,\s*paddingBottom:\s*8/);
  assert.match(dashboard, /notificationButton:\s*\{[\s\S]*?alignSelf:\s*'flex-start'/);
  assert.match(dashboard, /compactHeaderActions/);
  assert.match(dashboard, /windowWidth < 360/);
  assert.match(dashboard, /titleRow:\s*\{[\s\S]*?alignItems:\s*'center'/);
  assert.match(dashboard, /titleMark:\s*\{[\s\S]*?width:\s*38[\s\S]*?height:\s*38[\s\S]*?backgroundColor:\s*colors\.gold/);
  assert.match(dashboard, /<Feather name="grid" size=\{19\} color=\{colors\.accentForeground\}/);
  assert.match(dashboard, /title:\s*\{\s*fontFamily:\s*'DMSans_700Bold',\s*fontSize:\s*26/);
});

test('Habits header aligns with the primary tabs without changing its type size', () => {
  const habits = source('../app/(tabs)/habits.tsx');
  const challengeHabits = source('../app/(tabs)/challenge-habits.tsx');
  assert.match(habits, /listContent:\s*\{\s*paddingTop:\s*embedded\s*\?\s*0\s*:\s*12/);
  assert.match(challengeHabits, /titleMark:\s*\{\s*width:\s*38,\s*height:\s*38/);
  assert.match(challengeHabits, /title:\s*\{\s*fontFamily:\s*'DMSans_700Bold',\s*fontSize:\s*26/);
});

test('feed keeps swipe paging without rebuilding offsets and memoizes unchanged post cards', () => {
  const feed = source('../app/feed.tsx');
  const postCard = source('../components/PostCard.tsx');
  assert.match(feed, /const renderFeedPost = useCallback/);
  assert.match(feed, /const pageStyle = useMemo/);
  assert.match(feed, /renderItem=\{renderFeedPost\}/);
  assert.match(feed, /snapToInterval=\{posts\?\.length \? pageHeight : undefined\}/);
  assert.doesNotMatch(feed, /snapToOffsets=/);
  assert.doesNotMatch(feed, /onFollowChanged=\{refetch\}/, 'query invalidation already refetches the active feed after following');
  assert.match(postCard, /export default React\.memo\(PostCard\)/);
});

test('route headers hide default development labels and portfolio has exactly one navigation bar', () => {
  const root = source('../app/_layout.tsx');
  assert.match(root, /headerBackButtonDisplayMode: 'minimal'/);
  assert.match(root, /screenOptions=\{\{\s*headerShown: false/);
  assert.match(root, /name="learning-portfolio"[\s\S]*?title: 'Learning Portfolio'/);
  assert.doesNotMatch(source('../app/learning-portfolio.tsx'), /arrow-left|<Stack\.Screen/);
  assert.match(source('../app/learning-portfolio.tsx'), /paddingTop: 20/);
});

test('screen recovery resets only the screen, without reloading or exposing private errors', async () => {
  let reset = 0, reload = 0;
  const result = mount('../components/ErrorFallback.tsx', {
    'react-native': native,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) },
    '@/hooks/useColors': { useColors: () => ({}) },
    '@expo/vector-icons': { Feather: 'Feather' },
    expo: { reloadAppAsync: async () => { reload++; } },
    '@/lib/errorDiagnostics': { getErrorDiagnosticCode: () => 'CS-FEED-TYPE' },
  }, { error: new TypeError('private caption and URL'), diagnosticCode: 'CS-FEED-TYPE', resetError: () => reset++, recoverLocally: true });
  const button = find(result.tree, node => node.props?.testID === 'app-error-retry');
  await button.props.onPress();
  assert.equal(reset, 1);
  assert.equal(reload, 0);
  assert.equal(result.tree.type, 'ScrollView');
  assert.equal(result.tree.props.contentContainerStyle[1].paddingTop, 83);
  assert.doesNotMatch(JSON.stringify(result.tree), /private caption and URL/);
});

test('portfolio renders loading, error, empty and valid work without malformed-array crashes', () => {
  for (const response of [
    { isLoading: true }, { isError: true }, { data: [] }, { data: {} },
    { data: [null, { id: 1, moduleTitle: 'Practice', status: 'pending', submittedAt: '2026-10-14' }] },
  ]) {
    const result = mount('../app/learning-portfolio.tsx', {
      'react-native': native,
      '@expo/vector-icons': { Feather: 'Feather' },
      'expo-router': { Redirect: 'Redirect', useRouter: () => ({ replace() {} }) },
      '@clerk/expo': { useAuth: () => ({ isLoaded: true, isSignedIn: true }) },
      'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) },
      '@workspace/api-client-react': { getListAssignmentsQueryKey: () => [], useListAssignments: () => ({ refetch() {}, ...response }) },
      '@/hooks/useColors': { useColors: () => ({ radius: 12 }) },
    });
    assert.equal(result.tree.props.testID, 'learning-portfolio');
    if (response.data && !Array.isArray(response.data)) assert.match(JSON.stringify(result.tree), /Could not load your portfolio/);
    if (Array.isArray(response.data) && response.data.length) assert.ok(find(result.tree, node => node.props?.testID === 'portfolio-entry-1'));
  }
});

test('feed video pauses when backgrounded or blurred and does not load inactive media', () => {
  const listeners = {};
  const sources = [];
  let focusedCallback, pauses = 0, plays = 0;
  const player = { pause: () => pauses++, play: () => plays++, addListener: (event, fn) => { listeners[event] = fn; return { remove() {} }; } };
  const props = { uri: 'https://example.invalid/private-media', active: true, reducedMotion: false, muted: true, onMutedChange() {} };
  const result = mount('../components/StudioVideo.tsx', {
    'react-native': { ...native, AppState: { currentState: 'active', addEventListener: (event, fn) => { listeners[event] = fn; return { remove() {} }; } } },
    '@expo/vector-icons': { Feather: 'Feather' },
    'expo-video': { VideoView: 'VideoView', useVideoPlayer: uri => { sources.push(uri); return player; } },
    'expo-router': { useFocusEffect: fn => { focusedCallback = fn; } },
  }, props);
  const blur = focusedCallback();
  result.render();
  result.effects.forEach(fn => fn());
  assert.equal(plays, 1);
  listeners.change('background');
  result.render();
  result.effects.forEach(fn => fn());
  assert.ok(pauses > 0);
  assert.equal(plays, 1);
  listeners.statusChange({ status: 'error' });
  result.render();
  assert.match(JSON.stringify(result.tree), /Video couldn.t load/);
  blur();
  props.active = false;
  result.render();
  assert.equal(sources.at(-1), null);
  props.preload = true;
  focusedCallback();
  listeners.change('active');
  result.render();
  result.effects.forEach(fn => fn());
  assert.equal(sources.at(-1).uri, props.uri);
  assert.equal(sources.at(-1).useCaching, true);
  assert.equal(plays, 1, 'preloading the next video must never play it');
});

test('workshop placeholders clearly distinguish sample artwork from unavailable video lessons', () => {
  const placeholder = source('../components/WorkshopPreviewPlaceholder.tsx');
  const workshops = source('../app/(tabs)/workshops.tsx');
  assert.match(placeholder, /PREVIEW COMING SOON/);
  const badge = placeholder.match(/badge: \{([^\n]*)/)[1];
  assert.doesNotMatch(badge, /position: 'absolute'/);
  assert.match(badge, /maxWidth: '100%'/);
  assert.match(workshops, /workshops\.slice\(0, 4\)/);
  assert.match(workshops, /testID="workshops-page-heading"/);
  assert.match(workshops, /<Text style=\{s\.title\} numberOfLines=\{1\}>Workshops<\/Text>/);
  assert.match(workshops, /<Text style=\{s\.subtitle\} numberOfLines=\{1\}>One craft\. One apprenticeship\.<\/Text>/);
  assert.match(workshops, /<Text style=\{s\.intro\}>Full lessons require membership or instructor enrollment\.<\/Text>/);
  assert.equal((workshops.match(/Video previews and full lessons aren’t available yet\./g) || []).length, 1);
  assert.doesNotMatch(workshops, /Preview available — full access coming soon/);
  assert.doesNotMatch(workshops, /Example workshops below\. Preview videos and lesson details are coming soon\./);
  assert.match(workshops, /embedded \? 16 : Platform\.OS === 'web' \? 67 : insets\.top \+ 8/);
  assert.match(source('../components/WorkshopLessonPlayer.tsx'), /workshop-preview-error/);
});

test('high-traffic cards keep short summaries while preserving action and storage guidance', () => {
  const tour = source('../components/CreatorAppTour.tsx');
  const summaries = [...tour.matchAll(/body: '([^']+)'/g)].map(match => match[1]);
  assert.equal(summaries.length, 5);
  for (const summary of summaries) assert.ok(summary.split(/\s+/).length <= 8);
  const habits = source('../components/HabitCard.tsx');
  assert.match(habits, /Camera or Photos adds proof; ✓ logs it/);
  assert.match(habits, /Delete also removes history/);
  assert.match(habits, /Free on every plan/);
  const arcade = source('../components/MiniHabitStudioCard.tsx');
  assert.match(arcade, /backgroundColor: colors\.card/);
  assert.match(arcade, /Saved on this device/);
  assert.match(arcade, /accessibilityLabel="Start a 60-second Flash Sketch"/);
});

test('authentication entry screens follow the app theme instead of a fixed dark palette', () => {
  for (const screen of ['sign-in', 'sign-up']) {
    const auth = source(`../app/(auth)/${screen}.tsx`);
    assert.match(auth, /const colors = useColors\(\)/);
    assert.match(auth, /backgroundColor: colors\.background/);
    assert.match(auth, /backgroundColor: colors\.card/);
    assert.match(auth, /placeholderTextColor=\{colors\.mutedForeground\}/);
    assert.doesNotMatch(auth, /#[0-9a-fA-F]{3,8}\b/);
  }
  assert.match(source('../app/(auth)/_layout.tsx'), /backgroundColor: colors\.background/);
});

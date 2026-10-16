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

test('four workshop placeholders retain normal-flow badges and explicit preview availability', () => {
  const placeholder = source('../components/WorkshopPreviewPlaceholder.tsx');
  assert.match(placeholder, /PREVIEW COMING SOON/);
  const badge = placeholder.match(/badge: \{([^\n]*)/)[1];
  assert.doesNotMatch(badge, /position: 'absolute'/);
  assert.match(badge, /maxWidth: '100%'/);
  assert.match(source('../app/(tabs)/workshops.tsx'), /workshops\.slice\(0, 4\)/);
  assert.match(source('../components/WorkshopLessonPlayer.tsx'), /workshop-preview-error/);
});

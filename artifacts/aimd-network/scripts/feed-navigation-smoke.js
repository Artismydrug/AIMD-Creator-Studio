const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function mount(path, dependencies, props = {}) {
  const states = [];
  let cursor = 0, tree;
  const sandbox = {
    exports: {},
    require(name) {
      if (name === 'react') return {
        useMemo: fn => fn(),
        useCallback: fn => fn,
        useState: value => {
          const i = cursor++;
          if (!(i in states)) states[i] = value;
          return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
        },
      };
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment' };
      if (dependencies[name]) return dependencies[name];
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(resolve(__dirname, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, sandbox);
  const render = () => { cursor = 0; tree = sandbox.exports.default(props); return tree; };
  render();
  return { render, get tree() { return tree; }, exports: sandbox.exports };
}
function find(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) { const result = find(child, predicate); if (result) return result; }
  } else if (node && typeof node === 'object') {
    return predicate(node) ? node : find(node.props?.children, predicate);
  }
}
const node = (tree, id) => find(tree, item => item.props?.testID === id);
function findAll(node, predicate, results = []) {
  if (Array.isArray(node)) node.forEach(child => findAll(child, predicate, results));
  else if (node && typeof node === 'object') {
    if (predicate(node)) results.push(node);
    findAll(node.props?.children, predicate, results);
  }
  return results;
}
const native = {
  ...Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'Modal', 'Pressable', 'ScrollView'].map(name => [name, name])),
  Platform: { OS: 'ios' }, StyleSheet: { create: value => value, absoluteFill: { position: 'absolute' } },
  useWindowDimensions: () => ({ width: 390, height: 844 }),
};
const common = {
  'react-native': native,
  '@expo/vector-icons': { Feather: 'Feather' },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) },
  '@/hooks/useColors': { useColors: () => ({ radius: 12, card: 'cream', foreground: 'ink' }) },
  '@/lib/appearance': { useAppearance: () => ({ scheme: 'light' }) },
};

test('Feed keeps one stable pager while its navigation owns the restored section tabs', () => {
  const h = mount('../app/(tabs)/community.tsx', {
    ...common,
    '@/lib/haptics': { safeImpact: async () => {} },
    '../feed': { __esModule: true, default: 'FeedScreen' },
    './events': { __esModule: true, default: 'EventsScreen' },
    './directory': { __esModule: true, default: 'DirectoryScreen' },
  });
  let feed = find(h.tree, item => item.type === 'FeedScreen');
  assert.ok(feed);
  assert.equal(node(h.tree, 'community-feed-tab'), undefined, 'expanded tabs must take no space in the feed');
  assert.equal(JSON.stringify(h.tree).includes('Make · Share · Connect.'), false);
  feed.props.onCommunitySectionChange('creators');
  h.render();
  assert.ok(find(h.tree, item => item.type === 'DirectoryScreen'));
  node(h.tree, 'community-feed-tab').props.onPress();
  h.render();
  assert.ok(find(h.tree, item => item.type === 'FeedScreen'));
  assert.equal(node(h.tree, 'community-events-tab'), undefined);
});

test('compact overlay keeps feed filters, compose and the three requested destinations', () => {
  const calls = [], routes = [];
  const props = {
    mode: 'all', menuOpen: false, embedded: true, activeIndex: 3, postCount: 9,
    onMenuOpenChange: open => calls.push(['menu', open]),
    onModeChange: mode => calls.push(['mode', mode]),
    onScopeChange: scope => calls.push(['scope', scope]),
    onCommunitySectionChange: section => calls.push(['section', section]),
    onCompose: () => calls.push(['compose']),
  };
  const h = mount('../components/FeedNavigation.tsx', {
    ...common,
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': { useFocusEffect() {}, useRouter: () => ({ push: path => routes.push(path) }) },
  }, props);
  const overlay = node(h.tree, 'feed-navigation-overlay');
  assert.equal(overlay.props.style[0].position, 'absolute', 'controls must not reduce the pager height');
  assert.equal(overlay.props.style[1].paddingTop, 67);
  assert.equal(h.exports.feedControlsInset(59), 127);
  assert.equal(find(h.tree, item => item.type === 'Modal').props.visible, false);
  node(h.tree, 'feed-filter-following').props.onPress();
  node(h.tree, 'create-studio-post').props.onPress();
  node(h.tree, 'feed-menu-toggle').props.onPress();
  assert.deepEqual(calls, [['mode', 'following'], ['compose'], ['menu', true]]);
  props.menuOpen = true;
  h.render();
  assert.equal(find(h.tree, item => item.type === 'Modal').props.visible, true);
  const menuItems = findAll(h.tree, item => typeof item.props?.testID === 'string' && item.props.testID.startsWith('feed-menu-') && !['feed-menu-toggle', 'feed-menu-close', 'feed-menu-backdrop'].includes(item.props.testID));
  assert.deepEqual(menuItems.map(item => item.props.testID), ['feed-menu-community', 'feed-menu-creators', 'feed-menu-events']);
  node(h.tree, 'feed-menu-creators').props.onPress();
  node(h.tree, 'feed-menu-events').props.onPress();
  node(h.tree, 'feed-menu-community').props.onPress();
  assert.ok(calls.some(call => call[0] === 'section' && call[1] === 'creators'));
  assert.ok(calls.some(call => call[0] === 'section' && call[1] === 'events'));
  assert.deepEqual(routes, []);
  const scopesBefore = calls.filter(call => call[0] === 'scope').length;
  find(h.tree, item => item.type === 'Modal').props.onRequestClose();
  node(h.tree, 'feed-menu-backdrop').props.onPress();
  assert.equal(calls.filter(call => call[0] === 'scope').length, scopesBefore);
  assert.deepEqual(calls.at(-1), ['menu', false]);
});

test('feed header hides while swiping down through posts and returns after an upward scroll', () => {
  const h = mount('../components/FeedNavigation.tsx', {
    ...common,
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': { useFocusEffect() {}, useRouter: () => ({}) },
  }, { mode: 'all', menuOpen: false, embedded: true, expanded: true, onMenuOpenChange() {}, onExpandedChange() {}, onScopeChange() {}, activeIndex: 0, postCount: 4 });
  const tracker = { offset: 0, direction: null, distance: 0 };
  assert.equal(h.exports.updateFeedHeaderFromScroll(tracker, 10), null);
  assert.equal(h.exports.updateFeedHeaderFromScroll(tracker, 28), false);
  assert.equal(h.exports.updateFeedHeaderFromScroll(tracker, 45), null);
  assert.equal(h.exports.updateFeedHeaderFromScroll(tracker, 21), true);
});

test('original section tabs collapse while the pager keeps its full viewport', () => {
  const calls = [];
  const props = {
    mode: 'all', menuOpen: false, embedded: true, expanded: true, activeIndex: 0, postCount: 3,
    onMenuOpenChange: value => calls.push(['menu', value]),
    onExpandedChange: value => calls.push(['expanded', value]),
    onControlsHeightChange: value => calls.push(['height', value]),
    onScopeChange: value => calls.push(['scope', value]),
    onCommunitySectionChange: value => calls.push(['section', value]),
  };
  const h = mount('../components/FeedNavigation.tsx', {
    ...common,
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': { useFocusEffect() {}, useRouter: () => ({}) },
  }, props);
  assert.ok(node(h.tree, 'feed-expanded-navigation'));
  for (const section of ['feed', 'creators', 'events']) node(h.tree, `community-${section}-tab`).props.onPress();
  assert.deepEqual(calls, [['scope', 'community'], ['section', 'creators'], ['section', 'events']]);
  node(h.tree, 'feed-navigation-overlay').props.onLayout({ nativeEvent: { layout: { height: 230 } } });
  node(h.tree, 'feed-header-collapse').props.onPress();
  assert.deepEqual(calls.slice(-2), [['height', 230], ['expanded', false]]);
  props.expanded = false;
  props.menuOpen = true;
  h.render();
  assert.equal(node(h.tree, 'feed-expanded-navigation'), undefined);
  assert.equal(node(h.tree, 'feed-navigation-overlay').props.style[0].position, 'absolute');
  const menuItems = findAll(h.tree, item => typeof item.props?.testID === 'string' && item.props.testID.startsWith('feed-menu-') && !['feed-menu-toggle', 'feed-menu-close', 'feed-menu-backdrop'].includes(item.props.testID));
  assert.deepEqual(menuItems.map(item => item.props.testID), ['feed-menu-community', 'feed-menu-creators', 'feed-menu-events']);
});

test('scroll direction restores the tabs and measured controls protect writing and video buttons', () => {
  const feed = readFileSync(resolve(__dirname, '../app/feed.tsx'), 'utf8');
  const tabs = readFileSync(resolve(__dirname, '../app/(tabs)/_layout.tsx'), 'utf8');
  assert.match(tabs, /name="community"[\s\S]*?title: 'Feed'/);
  assert.match(feed, /updateFeedHeaderFromScroll\(\s*feedScrollTracker\.current/);
  assert.match(feed, /if \(nextExpanded !== null\) setFeedHeaderExpanded\(nextExpanded\)/);
  assert.match(feed, /onControlsHeightChange=\{syncControlsHeight\}/);
  assert.match(feed, /contentTopInset=\{controlsTopInset\}/);
  assert.match(feed, /snapToInterval=\{posts\?\.length \? pageHeight : undefined\}/);
  assert.match(feed, /maxHeight: pageHeight/);
});

test('standalone Feed menu offers only the three requested destinations', () => {
  const routes = [];
  const h = mount('../components/FeedNavigation.tsx', {
    ...common,
    'expo-linear-gradient': { LinearGradient: 'LinearGradient' },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': { useFocusEffect() {}, useRouter: () => ({ push: path => routes.push(path) }) },
  }, { mode: 'all', menuOpen: true, embedded: false, onMenuOpenChange() {}, onScopeChange() {}, activeIndex: 0, postCount: 0 });
  const menuItems = findAll(h.tree, item => typeof item.props?.testID === 'string' && item.props.testID.startsWith('feed-menu-') && !['feed-menu-toggle', 'feed-menu-close', 'feed-menu-backdrop'].includes(item.props.testID));
  assert.deepEqual(menuItems.map(item => item.props.testID), ['feed-menu-community', 'feed-menu-creators', 'feed-menu-events']);
  node(h.tree, 'feed-menu-community').props.onPress();
  node(h.tree, 'feed-menu-creators').props.onPress();
  node(h.tree, 'feed-menu-events').props.onPress();
  assert.deepEqual(routes, ['/(tabs)/directory', '/(tabs)/events']);
});

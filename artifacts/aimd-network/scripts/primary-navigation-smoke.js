const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const read = file => fs.readFileSync(path.resolve(__dirname, file), 'utf8');

function load(file, dependencies = {}) {
  const sandbox = { exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency: ${name}`);
  }};
  vm.runInNewContext(ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, sandbox);
  return sandbox.exports;
}
const config = load('../lib/primaryNavigation.ts');
function nodes(tree, found = []) {
  if (Array.isArray(tree)) tree.forEach(child => nodes(child, found));
  else if (tree && typeof tree === 'object') { found.push(tree); nodes(tree.props?.children, found); }
  return found;
}
function bar(active = 'challenge-habits', prevent = false) {
  const calls = [];
  const names = ['index', 'community', 'profile-tab', 'workshops', 'dashboard', 'challenge-habits', 'events'];
  const routes = names.map(name => ({ name, key: name }));
  const Component = load('../components/FrostedTabBar.tsx', {
    react: {},
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': {
      Platform: { OS: 'ios' }, StyleSheet: { create: s => s, hairlineWidth: 1 },
      Text: 'Text', View: 'View', TouchableOpacity: 'TouchableOpacity',
    },
    '@expo/vector-icons': { Feather: 'Feather' },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 34 }) },
    '@/hooks/useColors': { useColors: () => ({}) },
    '@/lib/haptics': { safeImpact: async () => {} },
    '@/lib/primaryNavigation': config,
  }).default;
  const tree = Component({
    state: { routes, index: names.indexOf(active) },
    descriptors: Object.fromEntries(names.map(name => [name, { options: { title: name } }])),
    navigation: { emit: event => { calls.push(['event', event.type, event.target]); return { defaultPrevented: prevent }; },
      navigate: name => calls.push(['navigate', name]) },
  });
  return { calls, tabs: nodes(tree).filter(node => node.props?.testID?.startsWith('tab-')) };
}

test('primary tabs render in the required order regardless of router state order', () => {
  assert.equal(config.PRIMARY_LANDING_TAB, 'challenge-habits');
  const { tabs } = bar();
  assert.deepEqual(tabs.map(t => t.props.testID), ['tab-challenge-habits', 'tab-workshops', 'tab-community', 'tab-profile-tab']);
  for (const tab of tabs) {
    assert.equal(tab.props.accessibilityRole, 'tab');
    assert.ok(tab.props.accessibilityLabel);
  }
  assert.equal(tabs[0].props.accessibilityState.selected, true);
});

test('tab presses respect interception, preserve router events, and support long press', () => {
  const { tabs, calls } = bar();
  tabs[1].props.onPress();
  tabs[2].props.onLongPress();
  assert.deepEqual(calls, [['event', 'tabPress', 'workshops'], ['navigate', 'workshops'], ['event', 'tabLongPress', 'community']]);
  const blocked = bar('challenge-habits', true);
  blocked.tabs[1].props.onPress();
  assert.equal(blocked.calls.some(c => c[0] === 'navigate'), false);
});

test('dashboard tools stay in Studio hierarchy and Studio remains reachable from them', () => {
  const { tabs, calls } = bar('dashboard');
  assert.equal(tabs[3].props.accessibilityState.selected, true);
  tabs[3].props.onPress();
  assert.deepEqual(calls.at(-1), ['navigate', 'profile-tab']);
});

test('cold root launches daily action, while deferred dashboard links safely return to Studio', () => {
  const entry = read('../app/(tabs)/index.tsx');
  assert.match(entry, /export default function DailyLandingRoute\(\) \{\s*return <Redirect href="\/\(tabs\)\/challenge-habits"/);
  assert.match(read('../app/(tabs)/dashboard.tsx'), /withLaunchFeature\('dashboard', DashboardScreen\)/);
  const layout = read('../app/(tabs)/_layout.tsx');
  assert.match(layout, /initialRouteName=\{PRIMARY_LANDING_TAB\}/);
  assert.match(layout, /lazy: true/);
  assert.match(layout, /freezeOnBlur: true/);
  assert.match(layout, /animation: 'none'/);
  assert.match(layout, /name="dashboard" options=\{\{ href: null \}\}/);
  const studio = read('../app/profile.tsx');
  assert.match(studio, /hideBack=\{asTab && !LAUNCH_FEATURES\.dashboard\}/);
  assert.match(studio, /onDashboard=\{asTab && LAUNCH_FEATURES\.dashboard/);
  assert.match(studio, /router\.push\('\/notifications'\)/);
  assert.match(studio, /router\.push\('\/edit-profile'\)/);
  assert.match(read('../app/(tabs)/profile-tab.tsx'), /<ProfileScreen asTab/);
});

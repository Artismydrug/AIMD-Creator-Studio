const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

const compiled = ts.transpileModule(readFileSync(resolve(__dirname, '../components/HabitPracticeSummaryCard.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function mount(response = {}) {
  let selected = null, tree, opened = 0, retried = 0;
  const requests = [];
  const sandbox = { exports: {}, require(name) {
    if (name === 'react') return { useMemo: fn => fn(), useState: () => [selected, value => { selected = value; }] };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'react-native') return {
      ...Object.fromEntries(['View', 'Text', 'ScrollView', 'TouchableOpacity', 'ActivityIndicator'].map(x => [x, x])),
      StyleSheet: { create: value => value },
    };
    if (name === '@expo/vector-icons') return { Feather: 'Feather' };
    if (name === '@/hooks/useColors') return { useColors: () => ({ radius: 12 }) };
    if (name === '@/components/RisingPracticeFlame') return { default: 'RisingPracticeFlame' };
    if (name === '@workspace/api-client-react') return {
      useListHabits: () => ({ data: response.habits, isLoading: !!response.loading, isError: !!response.error }),
      getListHabitLogsQueryKey: params => ['logs', params],
      useListHabitLogs: (params, options) => {
        requests.push({ params, options });
        return { data: response.logs, isLoading: !!response.historyLoading, isError: !!response.historyError, refetch: async () => { retried++; } };
      },
    };
    throw new Error(`Unexpected dependency: ${name}`);
  } };
  vm.runInNewContext(compiled, sandbox);
  function render() { tree = sandbox.exports.default({ onOpenHabits: () => { opened++; } }); }
  render();
  return { render, get tree() { return tree; }, requests, opened: () => opened, retried: () => retried };
}
function all(node, predicate, result = []) {
  if (Array.isArray(node)) node.forEach(child => all(child, predicate, result));
  else if (node && typeof node === 'object') {
    if (predicate(node)) result.push(node);
    all(node.props?.children, predicate, result);
  }
  return result;
}
const byId = (tree, id) => all(tree, node => node.props?.testID === id)[0];
function day(daysAgo) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - daysAgo * 86400000).toISOString().slice(0, 10);
}

test('Your Habits shows four rolling flame bars and counts each completed day only once', () => {
  const h = mount({
    habits: { habits: [{ id: 1, name: 'Sketch' }, { id: 2, name: 'Write' }] },
    logs: [
      { date: day(0), completed: true }, { date: day(0), completed: true },
      { date: day(6), completed: true }, { date: day(7), completed: true },
      { date: day(14), completed: false }, null,
    ],
  });
  assert.match(JSON.stringify(h.tree), /Your Habits/);
  const bars = all(h.tree, node => node.props?.accessibilityRole === 'progressbar');
  assert.deepEqual(bars.map(node => node.props.accessibilityValue.now), [2, 1, 0, 0]);
  byId(h.tree, 'dashboard-habit-2').props.onPress();
  h.render();
  assert.equal(h.requests.at(-1).params.habitId, 2);
  byId(h.tree, 'dashboard-your-habits-open').props.onPress();
  assert.equal(h.opened(), 1);
});

test('empty, loading, malformed and failed history remain safe and truthful', () => {
  const empty = mount({ habits: { habits: [] } });
  assert.equal(empty.requests[0].options.query.enabled, false);
  assert.match(JSON.stringify(empty.tree), /Start a habit/);
  assert.match(JSON.stringify(mount({ loading: true }).tree), /Loading practice history/);
  assert.match(JSON.stringify(mount({ habits: { habits: {} } }).tree), /Couldn’t load your habits/);
  const failed = mount({ habits: { habits: [{ id: 1, name: 'Sketch' }] }, logs: {} });
  assert.match(JSON.stringify(failed.tree), /Couldn’t load practice history/);
  assert.equal(byId(failed.tree, 'dashboard-habit-weekly-chart'), undefined);
});

test('Dashboard replaces featured challenge with the habits card while Challenges retains submission', () => {
  const dashboard = readFileSync(resolve(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
  assert.match(dashboard, /<HabitPracticeSummaryCard onOpenHabits=\{\(\) => router\.push\('\/\(tabs\)\/challenge-habits'\)\}/);
  assert.doesNotMatch(dashboard, /useGetCurrentChallenge|Featured Challenge|Submit Challenge Entry/);
  assert.match(readFileSync(resolve(__dirname, '../app/(tabs)/challenges.tsx'), 'utf8'), /testID="challenges-submit-entry"/);
});

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

const compiled = ts.transpileModule(readFileSync(resolve(__dirname, '../components/HabitPracticeSummaryCard.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const fixture = {
  cycleStart: '2026-10-19', cycleEnd: '2026-11-15', currentWeekDays: 3, completedWeeks: 0,
  weeklyBonus: 50, monthlyBonus: 200,
  weeks: [0, 1, 2, 3].map((index) => ({ start: `2026-10-${19 + index}`, end: '2026-10-25', days: index === 0 ? 3 : 0, completed: false, current: index === 0 })),
};
function mount(response = { data: fixture }, embedded = false) {
  let opened = 0, retried = 0;
  const sandbox = { exports: {}, require(name) {
    if (name === 'react') return { useMemo: fn => fn(), useCallback: fn => fn };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
    if (name === 'react-native') return {
      ...Object.fromEntries(['View', 'Text', 'TouchableOpacity', 'ActivityIndicator'].map(x => [x, x])),
      StyleSheet: { create: value => value },
    };
    if (name === 'expo-router') return { useFocusEffect: () => {} };
    if (name === '@expo/vector-icons') return { Feather: 'Feather' };
    if (name === '@/hooks/useColors') return { useColors: () => ({}) };
    if (name === '@workspace/api-client-react') return {
      getGetPracticeMilestonesQueryKey: () => ['/api/habits/milestones'],
      useGetPracticeMilestones: () => ({ ...response, refetch: () => { retried++; } }),
    };
    throw new Error(`Unexpected dependency: ${name}`);
  }};
  vm.runInNewContext(compiled, sandbox);
  return {
    tree: sandbox.exports.default({ onOpenHabits: () => { opened++; }, embedded }),
    opened: () => opened, retried: () => retried,
  };
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
test('Monthly Streak displays real four-week progress and both reward amounts', () => {
  const h = mount();
  const text = JSON.stringify(h.tree);
  assert.match(text, /Monthly Streak/);
  assert.match(text, /Oct 19/);
  assert.match(text, /Nov 15/);
  assert.match(text, /50/);
  assert.match(text, /200/);
  assert.equal(all(h.tree, node => node.props?.accessibilityRole === 'progressbar').length, 4);
  const component = readFileSync(resolve(__dirname, '../components/HabitPracticeSummaryCard.tsx'), 'utf8');
  assert.match(component, /monthlyRewardText:.*color: colors\.studioInk/);
  assert.match(component, /monthlyRewardSub:.*color: colors\.studioInk/);
  assert.match(component, /weekLabel:.*color: colors\.studioInk/);
  assert.match(component, /weekCount:.*color: colors\.studioInk/);
  assert.match(component, /card: \{[\s\S]*?backgroundColor: colors\.studioInk,[\s\S]*?borderColor: colors\.studioViolet/);
  assert.match(component, /title: \{[\s\S]*?color: colors\.studioPaper/);
  assert.match(component, /dot: \{ width: 8, height: 8, borderRadius: 99/);
  byId(h.tree, 'dashboard-your-habits-open').props.onPress();
  assert.equal(h.opened(), 1);
  assert.equal(byId(mount({ data: fixture }, true).tree, 'dashboard-your-habits-open'), undefined);
});
test('loading, empty and failed results never invent earned progress', () => {
  assert.equal(all(mount({ isLoading: true }).tree, node => node.props?.accessibilityRole === 'progressbar').length, 0);
  const h = mount({ isError: true });
  byId(h.tree, 'monthly-streak-retry').props.onPress();
  assert.equal(h.retried(), 1);
  assert.match(JSON.stringify(mount({ data: { ...fixture, weeks: {} } }).tree), /load your streak/);
});
test('both routes share the same server-backed card and logging refreshes points', () => {
  const dashboard = readFileSync(resolve(__dirname, '../app/(tabs)/index.tsx'), 'utf8');
  const habits = readFileSync(resolve(__dirname, '../app/(tabs)/habits.tsx'), 'utf8');
  assert.match(dashboard, /<HabitPracticeSummaryCard/);
  assert.match(habits, /<HabitPracticeSummaryCard embedded/);
  assert.match(habits, /ListFooterComponent=\{[\s\S]*?<HabitPracticeSummaryCard embedded/);
  assert.match(habits, /Today's Habit/);
  assert.doesNotMatch(habits, /Today's Practice/);
  assert.match(habits, /<HabitCard[\s\S]*?stickerJam/);
  assert.doesNotMatch(habits, /Practice over time/);
  const card = readFileSync(resolve(__dirname, '../components/HabitCard.tsx'), 'utf8');
  assert.match(card, /getGetPracticeMilestonesQueryKey\(\)/);
  assert.match(card, /getGetDashboardSummaryQueryKey\(\)/);
});

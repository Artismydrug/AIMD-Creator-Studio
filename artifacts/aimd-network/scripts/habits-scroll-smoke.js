const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

const read = file => readFileSync(resolve(__dirname, file), 'utf8');

function jsxTree(file, inspect) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    inspect(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return source;
}

test('the Habits tagline, daily habit cards, and Monthly Streak share one non-sticky scroll', () => {
  let flatList, listHeader, habitHeader;
  jsxTree('../app/(tabs)/habits.tsx', node => {
    if (!ts.isJsxSelfClosingElement(node)) return;
    if (node.tagName.getText() !== 'FlatList') return;
    flatList = node;
    const headerProp = node.attributes.properties.find(prop =>
      ts.isJsxAttribute(prop) && prop.name.getText() === 'ListHeaderComponent');
    listHeader = headerProp?.initializer;
    assert.equal(node.attributes.properties.some(prop =>
      ts.isJsxAttribute(prop) && prop.name.getText() === 'stickyHeaderIndices'), false);
  });
  assert.ok(flatList, 'habit entries are rendered with the vertical list');
  assert.ok(listHeader, 'the overview must be part of the scrollable list header');

  function visitHeader(node) {
    if (!node) return;
    if (ts.isJsxAttribute(node) && node.name.getText() === 'testID'
      && node.initializer?.getText().includes('habits-scroll-header')) habitHeader = true;
    ts.forEachChild(node, visitHeader);
  }
  visitHeader(listHeader);
  assert.equal(habitHeader, true, 'the Habits title/stat cards move away with the content');
  const source = read('../app/(tabs)/habits.tsx');
  assert.doesNotMatch(source, /<Text style=\{s\.headerTitle\}>Habits<\/Text>/, 'avoid repeating Habits beneath the screen title');
  assert.match(source, /<Text style=\{s\.tagline\}>Discipline Eats Talent<\/Text>/);
  assert.match(source, /accessibilityLabel="Add habit"/, 'the add-habit action stays visible next to the tagline');
  for (const id of ['today-habit-header', 'habits-scroll-list']) assert.ok(source.includes(id));
  assert.match(source, /ListFooterComponent=\{[\s\S]*?HabitPracticeSummaryCard embedded[\s\S]*?HabitChallengeCard/);
  assert.doesNotMatch(source, /HabitChallengeCard[\s\S]{0,180}ListHeaderComponent/);
  assert.match(read('../components/HabitChallengeCard.tsx'), /testID="habits-active-challenges-card"[\s\S]*?Active Challenges[\s\S]*?router\.push\('\/challenges'\)/);
  assert.match(source, /scrollHeader/);
});

test('the Habits-only header scrolls with the daily loop and has no section switcher', () => {
  const source = read('../app/(tabs)/challenge-habits.tsx');
  const tabs = read('../app/(tabs)/_layout.tsx');
  const habits = read('../app/(tabs)/habits.tsx');
  assert.match(source, /<HabitsScreen embedded scrollHeader=\{sectionHeader\}/);
  assert.match(source, /testID="challenge-habits-scroll-header"/);
  assert.match(source, /sectionHeader\s*=\s*\([\s\S]*?styles\.header/);
  assert.match(source, /accessibilityRole="header">Habits<\/Text>/);
  assert.doesNotMatch(source, /ChallengesScreen|switcher|tablist|useState|Habits &amp; Challenges/);
  assert.match(source, /mainHeaderTopPadding\(insets\.top, Platform\.OS === 'web'\)/);
  assert.match(tabs, /name="challenge-habits"[\s\S]*?title: 'Habits',\s*tabBarLabel: 'Habits'/);
  assert.match(source, /paddingHorizontal: 16, paddingBottom: 8/);
  assert.match(habits, /topPad = embedded \? 8/);
  assert.match(habits, /statsRow:\s*\{\s*flexDirection: 'row',\s*gap: 12/);
  assert.match(habits, /sectionHeader:\s*\{[\s\S]*?paddingHorizontal: 16,\s*paddingTop: 20/);
});

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? files(path.join(dir, entry.name)) : entry.name.endsWith('.tsx') ? [path.join(dir, entry.name)] : []);
function load(file, dependencies = {}) {
  const sandbox = { exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unexpected dependency ${name}`);
  }};
  vm.runInNewContext(ts.transpileModule(read(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, sandbox);
  return sandbox.exports;
}
const scope = load('lib/launchFeatures.ts');
const jsx = (type, props) => ({ type, props });

test('v1 redirects every deferred feature before its hooks, requests, or media can mount', () => {
  const { withLaunchFeature } = load('components/LaunchFeatureScreen.tsx', {
    react: {}, 'react/jsx-runtime': { jsx }, 'expo-router': { Redirect: 'Redirect' },
    '@/lib/launchFeatures': scope,
  });
  let mounted = 0;
  const Screen = () => { mounted++; throw new Error('Deferred feature mounted'); };
  for (const feature of ['challenges', 'sideQuest', 'dashboard', 'memberDrops']) {
    assert.equal(scope.LAUNCH_FEATURES[feature], false);
    const screen = withLaunchFeature(feature, Screen)({});
    assert.equal(screen.type, 'Redirect');
    assert.equal(screen.props.href, scope.DEFERRED_FEATURE_DESTINATIONS[feature]);
    assert.ok(['/(tabs)/profile-tab', '/(tabs)/challenge-habits'].includes(screen.props.href));
  }
  assert.equal(mounted, 0);
});

test('retained implementations have explicit route gates, not orphan screens', () => {
  for (const [file, feature] of [
    ['app/(tabs)/dashboard.tsx', 'dashboard'], ['app/(tabs)/challenges.tsx', 'challenges'],
    ['app/mini-habit-studio.tsx', 'sideQuest'], ['app/rewards.tsx', 'memberDrops'],
  ]) assert.match(read(file), new RegExp(`export default withLaunchFeature\\('${feature}',`));
  assert.match(read('app/(tabs)/challenge-habits.tsx'), /LAUNCH_FEATURES\.challenges && <View style=\{styles.switcher\}/);
  assert.match(read('app/profile.tsx'), /onDashboard=\{asTab && LAUNCH_FEATURES\.dashboard/);
  assert.match(read('app/edit-profile.tsx'), /testID="edit-profile-accomplishments"/);
  assert.match(read('app/(tabs)/habits.tsx'), /HabitPracticeSummaryCard embedded/);
});

test('verified unused libraries and tier-referral UI are absent from v1 dependencies', () => {
  const pkg = JSON.parse(read('package.json'));
  const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of ['@expo-google-fonts/inter', '@expo-google-fonts/cormorant-garamond',
    'expo-blur', 'expo-glass-effect', 'expo-location', 'expo-symbols', 'zod-validation-error',
    '@stardazed/streams-text-encoding', '@ungap/structured-clone']) assert.equal(dependencies[name], undefined, name);
  assert.equal(fs.existsSync(path.join(root, 'components/ProEcosystemPortal.tsx')), false);
});

test('all literal mobile navigation links resolve to a real route', () => {
  const normalize = route => '/' + route.split('?')[0].split('#')[0].split('/')
    .filter(part => part && !/^\(.*\)$/.test(part) && part !== 'index').join('/');
  const routeFiles = files(path.join(root, 'app')).filter(file => !/\/(?:_layout|\+not-found)\.tsx$/.test(file));
  const routes = new Set(routeFiles.map(file => normalize(path.relative(path.join(root, 'app'), file).replace(/\.tsx$/, ''))));
  const broken = [];
  for (const file of [...routeFiles, ...files(path.join(root, 'components'))]) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const check = node => {
      if (!node || !ts.isStringLiteral(node) || !node.text.startsWith('/') || node.text.startsWith('//')) return;
      if (!routes.has(normalize(node.text))) broken.push(`${path.relative(root, file)} -> ${node.text}`);
    };
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && node.expression.expression.getText(source) === 'router'
        && ['push', 'replace', 'navigate'].includes(node.expression.name.text)) {
        const argument = node.arguments[0];
        check(argument);
        if (argument && ts.isObjectLiteralExpression(argument)) for (const prop of argument.properties)
          if (ts.isPropertyAssignment(prop) && prop.name.getText(source) === 'pathname') check(prop.initializer);
      }
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'href') check(node.initializer);
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.deepEqual(broken, []);
});

const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function transpile(file) {
  return ts.transpileModule(readFileSync(resolve(__dirname, file), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
      esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
}
const diagnostics = { exports: {}, Error };
vm.runInNewContext(transpile('../lib/errorDiagnostics.ts'), diagnostics);
const code = diagnostics.exports.getErrorDiagnosticCode;

test('release code identifies known error classes without private message or stack data', () => {
  const error = new TypeError('secret draft private@example.test https://example.test/?token=private');
  const result = code(error, '\n    at ProgressScreen (https://private.test/?token=hidden)\n    at RootLayoutNav');
  assert.equal(result, 'CS-DASHBOARD-TYPE');
  assert.doesNotMatch(result, /private|token|https|draft|@/);
});
test('notification stage is explicit even when stack has generic parent names', () => {
  assert.equal(code(new Error('TurboModuleRegistry: native module unavailable'), '\n at RootLayoutNav', 'NOTIFY'), 'CS-NOTIFY-NATIVE');
});
test('first known component is selected, including ForwardRef frames', () => {
  assert.equal(code(new Error('requireNativeComponent unavailable'), '\n at ForwardRef(KeyboardProvider) (/private/path)\n at RootLayoutNav'), 'CS-KEYBOARD-NATIVE');
  assert.equal(code(new Error('failure'), '\nSubscriptionProvider@file:///private\nRootLayoutNav'), 'CS-MEMBERSHIP-ERROR');
  assert.equal(code(new TypeError('private'), '\n at a (unknown)', 'SHELL'), 'CS-SHELL-TYPE');
  assert.equal(code(new TypeError('private'), '\n at ProgressScreen', 'NAVIGATION'), 'CS-DASHBOARD-TYPE');
});
test('hook, query, and navigation diagnostics use fixed categories', () => {
  assert.equal(code(new Error('Rendered more hooks than during the previous render')), 'CS-APP-HOOKS');
  assert.equal(code(new Error('No QueryClient set, use QueryClientProvider')), 'CS-APP-QUERY');
  assert.equal(code(new Error('Attempted to navigate before mounting the Root Layout component')), 'CS-APP-NAVIGATION');
});
test('arbitrary component names and non-error values are never exposed', () => {
  assert.equal(code(new Error('private'), '\n at PrivateUserName\n at TokenValue'), 'CS-APP-ERROR');
  assert.equal(code('private'), 'CS-APP-ERROR');
  assert.equal(code({ message: 'private', name: 'TypeError' }), 'CS-APP-ERROR');
  assert.equal(code(new Error('private'), null, 'private'), 'CS-APP-ERROR');
  const unusualName = new Error('private');
  unusualName.name = 'constructor';
  assert.equal(code(unusualName), 'CS-APP-ERROR');
});
test('diagnostic failure cannot prevent the fallback from rendering', () => {
  const error = new Error('private');
  Object.defineProperty(error, 'message', { get() { throw new Error('private getter'); } });
  assert.equal(code(error), 'CS-APP-ERROR');
});
test('the boundary passes a safe code, reports the original error, and clears diagnostics on retry', () => {
  const reported = [];
  class Component {
    constructor(props) { this.props = props; }
    setState(value) { this.state = { ...this.state, ...value }; }
  }
  const fallback = () => null;
  const sandbox = {
    exports: {}, Error,
    require: (name) => {
      if (name === 'react') return { Component };
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
      if (name === '@/components/ErrorFallback') return { ErrorFallback: fallback };
      if (name === '@/lib/errorDiagnostics') return diagnostics.exports;
      if (name === '@/lib/telemetry') return { reportException: (...args) => reported.push(args) };
      throw new Error(`Unexpected dependency ${name}`);
    },
  };
  vm.runInNewContext(transpile('../components/ErrorBoundary.tsx'), sandbox);
  const Boundary = sandbox.exports.ErrorBoundary;
  const instance = new Boundary({ FallbackComponent: fallback, children: 'app content' });
  const error = new ReferenceError('private missing value');
  instance.state = Boundary.getDerivedStateFromError(error);
  instance.componentDidCatch(error, { componentStack: '\n at ProgressScreen (/private)' });
  const result = instance.render();
  assert.equal(result.type, fallback);
  assert.equal(result.props.diagnosticCode, 'CS-DASHBOARD-REFERENCE');
  assert.equal(reported[0][0], error);
  assert.equal(reported[0][1], 'render');
  result.props.resetError();
  assert.equal(instance.render(), 'app content');
  assert.equal(instance.state.componentStack, null);
});
test('release fallback renders the support code but not raw details, even with the debug modal state set', () => {
  const sandbox = {
    exports: {}, Error, __DEV__: false,
    require: (name) => {
      if (name === 'react') return { useState: () => [true, () => {}] };
      if (name === 'react/jsx-runtime') return {
        jsx: (type, props) => ({ type, props }),
        jsxs: (type, props) => ({ type, props }),
      };
      if (name === 'react-native') return {
        Modal: 'Modal', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
        StyleSheet: { create: value => value }, Platform: { select: value => value.ios },
      };
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 47, bottom: 34 }) };
      if (name === '@/hooks/useColors') return { useColors: () => ({}) };
      if (name === '@expo/vector-icons') return { Feather: 'Feather' };
      if (name === 'expo') return { reloadAppAsync: async () => {} };
      if (name === '@/lib/errorDiagnostics') return diagnostics.exports;
      throw new Error(`Unexpected dependency ${name}`);
    },
  };
  vm.runInNewContext(transpile('../components/ErrorFallback.tsx'), sandbox);
  const tree = sandbox.exports.ErrorFallback({
    error: new TypeError('secret draft private@example.test'),
    resetError: () => {},
    diagnosticCode: 'CS-DASHBOARD-TYPE',
  });
  const rendered = JSON.stringify(tree);
  assert.match(rendered, /app-error-diagnostic/);
  assert.match(rendered, /CS-DASHBOARD-TYPE/);
  assert.doesNotMatch(rendered, /secret|draft|private@example|Stack Trace|"Modal"/);
});
test('optional notification fallback warns visibly and retries only on explicit request', () => {
  const alerts = [];
  let retries = 0;
  const sandbox = {
    exports: {}, Error,
    require: (name) => {
      if (name === 'react') return { useRef: value => ({ current: value }), useEffect: callback => callback() };
      if (name === 'react-native') return { Alert: { alert: (...args) => alerts.push(args) } };
      if (name === '@/lib/errorDiagnostics') return diagnostics.exports;
      throw new Error(`Unexpected dependency ${name}`);
    },
  };
  vm.runInNewContext(transpile('../components/NotificationStartupFallback.tsx'), sandbox);
  assert.equal(sandbox.exports.default({
    error: new Error('private message'), diagnosticCode: 'CS-NOTIFY-NATIVE',
    resetError: () => { retries++; },
  }), null);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0][1], /CS-NOTIFY-NATIVE/);
  assert.doesNotMatch(alerts[0][1], /private message/);
  assert.equal(retries, 0);
  assert.equal(alerts[0][2][0].text, 'Continue');
  assert.equal(alerts[0][2][0].onPress, undefined);
  alerts[0][2][1].onPress();
  assert.equal(retries, 1);
});
test('only the optional notification lifecycle is isolated from the main navigator', () => {
  const layout = readFileSync(resolve(__dirname, '../app/_layout.tsx'), 'utf8');
  assert.match(layout, /<ErrorBoundary diagnosticStage="NOTIFY" FallbackComponent=\{NotificationStartupFallback\}>\s*<NotificationLifecycle \/>\s*<\/ErrorBoundary>\s*<Stack/);
  assert.match(layout, /<ErrorBoundary diagnosticStage="MEMBERSHIP">\s*<SubscriptionProvider>/);
  assert.match(layout, /<ErrorBoundary diagnosticStage="SHELL">\s*<ThemedApp \/>/);
  assert.match(layout, /<ErrorBoundary diagnosticStage="NAVIGATION">\s*<RootLayoutNav \/>/);
  const fallback = readFileSync(resolve(__dirname, '../components/NotificationStartupFallback.tsx'), 'utf8');
  assert.match(fallback, /Alert\.alert/);
  assert.match(fallback, /Retry notifications/);
  assert.match(fallback, /onPress: resetError/);
});

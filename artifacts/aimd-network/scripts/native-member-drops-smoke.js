const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

// Use the exact AbortSignal implementation React Native installs in setUpXHR,
// rather than Node/browser globals that hide unsupported native APIs.
const nativeRequire = createRequire(require.resolve('react-native/package.json'));
const nativeAbort = nativeRequire('abort-controller/dist/abort-controller');
const source = readFileSync(resolve(__dirname, '../components/MonthlyMemberDrops.tsx'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function render(compact, response = {}) {
  const requests = [];
  const routes = [];
  const captures = [];
  const effects = [];
  const refetch = async () => {};
  const sandbox = {
    exports: {}, AbortController: nativeAbort.AbortController, AbortSignal: nativeAbort.AbortSignal,
    require: name => {
      if (name === 'react') return {
        useMemo: callback => callback(), useCallback: callback => callback,
        useRef: value => ({ current: value }), useState: value => [value, () => {}],
      };
      if (name === 'react/jsx-runtime') return {
        Fragment: 'Fragment', jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
      };
      if (name === 'react-native') return {
        View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Modal: 'Modal',
        ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator', StyleSheet: { create: value => value },
      };
      if (name === '@expo/vector-icons') return { Feather: 'Feather' };
      if (name === 'expo-router') return {
        useRouter: () => ({ push: route => routes.push(route) }),
        useFocusEffect: callback => effects.push(callback),
      };
      if (name === '@tanstack/react-query') return { useQueryClient: () => ({ invalidateQueries: async () => {} }) };
      if (name === '@workspace/api-client-react') return {
        getGetRewardsQueryKey: () => ['/api/rewards'],
        useGetRewards: options => {
          requests.push(options);
          return { isLoading: false, isError: false, refetch, ...response };
        },
        useRequestMonthlyDrop: () => ({ isPending: false, mutateAsync: async () => {} }),
      };
      if (name === '@/lib/telemetry') return { trackEvent: (...args) => captures.push(args) };
      if (name === '@/hooks/useColors') return { useColors: () => ({ radius: 12 }) };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  vm.runInNewContext(compiled, sandbox);
  const tree = sandbox.exports.default({ compact });
  return { tree, requests, routes, captures, effects };
}

function findNode(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findNode(item, predicate);
      if (found) return found;
    }
    return null;
  }
  return predicate(node) ? node : findNode(node.props?.children, predicate);
}

test('dashboard points card renders with the real native AbortSignal', () => {
  assert.equal(typeof nativeAbort.AbortSignal.timeout, 'undefined');
  const result = render(true, { data: { points: 75, monthlyDrop: null, recentRequests: [] } });
  const button = findNode(result.tree, node => node.props?.testID === 'open-monthly-member-drops');
  assert.ok(button);
  assert.match(JSON.stringify(result.tree), /75 points/);
  button.props.onPress();
  assert.deepEqual(result.routes, ['/rewards']);
  assert.equal(result.requests[0].request.timeoutMs, 10_000);
  assert.equal(result.requests[0].request.signal, undefined);
  assert.equal(result.requests[0].query.staleTime, 30_000);
  assert.equal(result.requests[0].query.retry, 1);
  assert.deepEqual(result.captures, [], 'Rendering or viewing points must not emit a reward-claim event');
});
test('points and drops render safely before data arrives on native', () => {
  const dashboard = render(true, { isLoading: true });
  assert.match(JSON.stringify(dashboard.tree), /— points/);
  const details = render(false, { isLoading: true });
  assert.ok(findNode(details.tree, node => node.type === 'ActivityIndicator'));
});
test('member drops request errors remain retryable rather than throwing during render', () => {
  const result = render(false, { isError: true });
  assert.match(JSON.stringify(result.tree), /Could not load your points and member drops/);
  assert.ok(findNode(result.tree, node => node.type === 'TouchableOpacity' && node.props.accessibilityRole === 'button'));
});
test('full member drops renders an active package using the native request timeout', () => {
  const result = render(false, {
    data: {
      points: 75, recentRequests: [],
      monthlyDrop: {
        id: 1, monthKey: '2026-11', title: 'Studio package',
        items: ['Art print'], remaining: 5, stock: 10, status: 'open', ownRequest: null,
      },
    },
  });
  assert.ok(findNode(result.tree, node => node.props?.testID === 'request-monthly-package'));
  assert.equal(result.requests[0].request.timeoutMs, 10_000);
  assert.deepEqual(result.captures, []);
});

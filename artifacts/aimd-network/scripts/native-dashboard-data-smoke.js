const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { createRequire } = require('node:module');
const nativeRequire = createRequire(require.resolve('react-native/package.json'));
const nativeAbort = nativeRequire('abort-controller/dist/abort-controller');
const compiled = ts.transpileModule(readFileSync(resolve(__dirname, '../app/(tabs)/index.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

// Execute the real Dashboard render, not a copied data-normalization function.
// Hooks supply deterministic API responses; no network, accounts, or writes.
function render(responses = {}, overrides = {}) {
  const requests = [];
  const captures = [];
  const routes = [];
  const mutations = {};
  const invalidations = [];
  let profileRefreshes = 0;
  const React = {
    useMemo: callback => callback(), useCallback: callback => callback,
    useRef: value => ({ current: value }), useState: value => [value, () => {}],
    useEffect: () => {},
  };
  const api = new Proxy({
    getBaseUrl: () => 'https://example.invalid',
    useGetUserProfile: (id, options) => {
      requests.push({ id, options });
      return { data: responses.profile, refetch: async () => { profileRefreshes++; } };
    },
  }, {
    get: (target, name) => {
      if (name in target) return target[name];
      if (name.startsWith('get')) return (...args) => [name, ...args];
      if (['useGetProgress', 'useGetCurrentChallenge', 'useGetCurrentUser', 'useGetNotifications'].includes(name)) {
        const key = { useGetProgress: 'progress', useGetCurrentChallenge: 'challenge', useGetCurrentUser: 'user', useGetNotifications: 'notifications' }[name];
        return () => ({ data: responses[key], isLoading: responses[key] === undefined, isError: !!responses[`${key}Error`], refetch: async () => {} });
      }
      if (name.startsWith('use')) return options => {
        mutations[name] = options?.mutation;
        return { isPending: false, mutate: () => {} };
      };
      throw new Error(`Unexpected API dependency: ${name}`);
    },
  });
  const sandbox = {
    exports: {}, AbortController: nativeAbort.AbortController, AbortSignal: nativeAbort.AbortSignal,
    ...overrides,
    require: name => {
      if (name === 'react') return React;
      if (name === 'react/jsx-runtime') return {
        Fragment: 'Fragment', jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }),
      };
      if (name === 'react-native') return {
        View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity',
        Modal: 'Modal', ActivityIndicator: 'ActivityIndicator', RefreshControl: 'RefreshControl',
        KeyboardAvoidingView: 'KeyboardAvoidingView', Image: 'Image', TextInput: 'TextInput',
        StyleSheet: { create: value => value }, Platform: { OS: 'ios' },
        useWindowDimensions: () => ({ width: 390, height: 844 }),
        Animated: { Value: class { interpolate() { return 0; } stopAnimation() {} } }, Easing: {},
        Alert: { alert: () => {} }, Linking: {}, AccessibilityInfo: {},
      };
      if (name === '@/hooks/useColors') return { useColors: () => ({ radius: 12 }) };
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) };
      if (name === '@expo/vector-icons') return { Feather: 'Feather' };
      if (name === 'expo-haptics') return { notificationAsync: async () => {}, NotificationFeedbackType: { Success: 'success' } };
      if (name === 'expo-image-picker') return {};
      if (name === 'expo-router') return { useRouter: () => ({ push: route => routes.push(route) }) };
      if (name === '@tanstack/react-query') return {
        useQueryClient: () => ({ invalidateQueries: async ({ queryKey }) => { invalidations.push(queryKey); } }),
      };
      if (name === '@workspace/api-client-react') return api;
      if (name === '@/lib/telemetry') return { trackEvent: (...args) => captures.push(args) };
      if (name === '@/lib/challengeProof') return {};
      if (name.startsWith('@/components/')) return { default: name };
      throw new Error(`Unexpected dependency: ${name}`);
    },
  };
  vm.runInNewContext(compiled, sandbox);
  const tree = sandbox.exports.default();
  return { tree, requests, captures, routes, mutations, invalidations, profileRefreshes: () => profileRefreshes };
}
function find(node, testID) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const found = find(child, testID); if (found) return found; }
    return null;
  }
  return node.props?.testID === testID ? node : find(node.props?.children, testID);
}
function findType(node, type) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const found = findType(child, type); if (found) return found; }
    return null;
  }
  return node.type === type ? node
    : findType(node.props?.refreshControl, type) || findType(node.props?.children, type);
}

test('check-in and daily-spin success each refresh points; failures do not', () => {
  for (const [hook, result] of [
    ['useCheckInProgress', { checkedInToday: true }],
    ['useSpinDailyReward', { alreadySpun: false, pointsAwarded: 10 }],
  ]) {
    const h = render();
    assert.equal(typeof h.mutations[hook]?.onSuccess, 'function', `${hook} must register success`);
    h.mutations[hook].onSuccess(result);
    assert.equal(h.invalidations.filter(key => key[0] === 'getGetRewardsQueryKey').length, 1, hook);
    h.invalidations.length = 0;
    h.mutations[hook].onError(new Error('offline'));
    assert.equal(h.invalidations.length, 0, `${hook} failure must not refresh as though points were earned`);
  }
});

test('Dashboard pull-to-refresh invalidates points and habit history', async () => {
  const h = render();
  const refreshControl = findType(h.tree, 'RefreshControl');
  assert.ok(refreshControl, 'Dashboard exposes pull-to-refresh');
  await refreshControl.props.onRefresh();
  for (const name of ['getGetRewardsQueryKey', 'getListHabitsQueryKey', 'getListHabitLogsQueryKey']) {
    assert.equal(h.invalidations.filter(key => key[0] === name).length, 1, name);
  }
});
const challenge = { challenge: { theme: 'Practice', deadline: '2026-11-13', status: 'upcoming' } };
test('Dashboard survives all hook initialization orders, including missing username', () => {
  for (const progress of [undefined, null, {}, { recentBadges: null }, { recentBadges: [] }]) {
    for (const user of [undefined, null, {}, { id: 1 }, { id: 1, username: null }, { id: 1, username: 123 }]) {
      const result = render({ progress, user, challenge });
      assert.ok(find(result.tree, 'progress-screen'));
      assert.deepEqual(result.captures, []);
      assert.equal(result.requests[0].options.query.enabled, user?.id === 1);
    }
  }
});
test('null elements and malformed array responses cannot throw during Dashboard rendering', () => {
  for (const badArray of [null, {}, 'pending', [null, undefined, {}]]) {
    const result = render({
      progress: { recentBadges: badArray, nextBadge: {} },
      user: { id: 1, avatarUrl: 42 },
      profile: { avatarUrl: { pending: true } },
      challenge: { ...challenge, submissions: badArray },
    });
    assert.ok(find(result.tree, 'dashboard-loaded-state'));
    assert.match(JSON.stringify(result.tree), /your profile/i);
    assert.doesNotMatch(JSON.stringify(result.tree), /NaN%|undefined%/);
  }
});
test('valid profile, badges, streaks and habits retain their displayed data and routes', () => {
  const result = render({
    user: { id: 1, username: 'creator' }, profile: { username: 'studio', avatarUrl: '/objects/avatar' },
    progress: { currentStreak: 12, todayHabitsCompleted: 2, totalHabits: 3, recentBadges: [{ id: 1, name: 'Consistent', earnedAt: '2026-10-13' }], checkedInToday: true, spinAvailableToday: false },
    challenge: { ...challenge, submissions: [{ id: 1, username: 'artist', caption: 'Practice', finalMedia: null }] },
  });
  assert.match(JSON.stringify(result.tree), /@studio/);
  assert.match(JSON.stringify(result.tree), /Consistent/);
  find(result.tree, 'dashboard-profile-button').props.onPress();
  assert.deepEqual(result.routes, ['/profile']);
  assert.deepEqual(result.captures, []);
});
test('missing progress remains loading and failure remains retryable, not fake zero data', () => {
  assert.ok(find(render().tree, 'dashboard-loading-state'));
  const failed = render({ progressError: true });
  assert.match(JSON.stringify(failed.tree), /Could not load your progress/);
  assert.equal(find(failed.tree, 'dashboard-loaded-state'), null);
});
test('refresh does not request a profile before its valid user ID is initialized', async () => {
  const result = render({ progress: {}, user: {} });
  const scroll = result.tree.props.children.flat().find(node => node?.type === 'ScrollView');
  await scroll.props.refreshControl.props.onRefresh();
  assert.equal(result.profileRefreshes(), 0);
});
test('missing native Intl support falls back to UTC without a render exception', () => {
  assert.ok(find(render({}, { Intl: undefined }).tree, 'progress-screen'));
});
test('successful check-in telemetry remains unchanged and sends no profile content', () => {
  const result = render({ progress: { checkedInToday: false }, user: { id: 1, username: 'private' } });
  result.mutations.useCheckInProgress.onSuccess({ checkedInToday: true });
  assert.deepEqual(result.captures, [['daily_check_in_completed']]);
});

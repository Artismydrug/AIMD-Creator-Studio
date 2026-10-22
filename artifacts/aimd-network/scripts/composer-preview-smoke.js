const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const photoFormats = [
  { id: 'portrait', label: 'Portrait 4:5', ratio: 4 / 5 },
  { id: 'square', label: 'Square 1:1', ratio: 1 },
  { id: 'landscape', label: 'Wide 1.91:1', ratio: 1080 / 566 },
];

function compile(path) {
  return ts.transpileModule(readFileSync(resolve(__dirname, path), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
}

function harness(kind, { failUpload = false, failPost = false, canceled = false } = {}) {
  const states = [], refs = [], uploads = [], posts = [], alerts = [];
  let stateIndex = 0, refIndex = 0, mutationOptions, tree;
  const media = { uri: `file:///private/track.${kind === 'audio' ? 'mp3' : 'jpg'}`, type: kind, name: 'track.mp3', fileName: 'private-media', mimeType: kind === 'video' ? 'video/mp4' : 'image/jpeg', size: 100, fileSize: 100, duration: 1000 };
  const jsx = (type, props) => ({ type, props });
  const picker = async () => ({ canceled, assets: [media] });
  const lockSandbox = { exports: {} };
  vm.runInNewContext(compile('../lib/submissionLock.ts'), lockSandbox);
  const sandbox = {
    exports: {}, requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
    fetch: async () => ({ arrayBuffer: async () => new ArrayBuffer(100) }),
    require(name) {
      if (name === 'react') return {
        useState(value) {
          const i = stateIndex++;
          if (!(i in states)) states[i] = value;
          return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
        },
        useRef(value) { const i = refIndex++; return refs[i] ||= { current: value }; },
        useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {},
      };
      if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
      if (name === 'react-native') return {
        ...Object.fromEntries(['View', 'Text', 'FlatList', 'TouchableOpacity', 'Modal', 'TextInput', 'ActivityIndicator', 'RefreshControl', 'Image'].map(n => [n, n])),
        StyleSheet: { create: value => value }, Platform: { OS: 'ios' },
        Alert: { alert: (...args) => alerts.push(args) },
        useWindowDimensions: () => ({ height: 844, width: 390 }),
      };
      if (name === '@/hooks/useColors') return { useColors: () => ({ radius: 12 }) };
      if (name === '@/lib/safeArea') return { mainHeaderTopPadding: (insetTop, isWeb) => isWeb ? 67 : Math.max(insetTop, 24) + 8 };
      if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 59, bottom: 34 }) };
      if (name === '@expo/vector-icons') return { Feather: 'Feather' };
      if (name === '@/components/FeedNavigation') return { __esModule: true, default: 'FeedNavigation', feedControlsInset: top => top + 68, updateFeedHeaderFromScroll: () => null };
      if (name === '@clerk/expo') return { useAuth: () => ({ getToken: async () => 'test-token' }) };
      if (name === '@/lib/studioMedia') return {
        STUDIO_PORTRAIT_RATIO: 9 / 16,
        STUDIO_PHOTO_FORMATS: photoFormats,
        studioPhotoFormat: id => photoFormats.find(format => format.id === id) ?? photoFormats[0],
        MAX_STUDIO_VIDEO_BYTES: 50 * 1024 * 1024,
        MAX_STUDIO_AUDIO_BYTES: 25 * 1024 * 1024,
        uploadStudioMedia: async (media, getToken, onStatus) => {
          uploads.push({ media });
          onStatus({ phase: 'uploading', progress: 0.5 });
          if (failUpload) throw new Error('Upload failed');
          return '/objects/media';
        },
      };
      if (name === 'expo-haptics') return { impactAsync: () => {}, notificationAsync: () => {}, ImpactFeedbackStyle: {}, NotificationFeedbackType: {} };
      if (name === 'expo-image-picker') return {
        requestMediaLibraryPermissionsAsync: async () => ({ status: 'granted' }),
        requestCameraPermissionsAsync: async () => ({ granted: true }),
        launchImageLibraryAsync: picker, launchCameraAsync: picker, UIImagePickerControllerQualityType: { Medium: 1 },
        VideoExportPreset: { H264_1280x720: 6 },
      };
      if (name === 'expo-document-picker') return { getDocumentAsync: picker };
      if (name === '@/lib/submissionLock') return lockSandbox.exports;
      if (name === '@react-native-async-storage/async-storage') return {};
      if (name === 'expo-router') return { useRouter: () => ({ back() {} }), useLocalSearchParams: () => ({}), useFocusEffect() {} };
      if (name === '@tanstack/react-query') return { useQueryClient: () => ({ setQueryData() {}, invalidateQueries() {} }) };
      if (name === '@workspace/api-client-react') return {
        getListStudioPostsQueryKey: () => [],
        useListStudioPosts: () => ({ data: [], isLoading: false }),
        useGetCurrentUser: () => ({ data: { id: 1 } }),
        customFetch: async (path, options) => {
          uploads.push({ path, options });
          if (failUpload) throw new Error('Upload failed');
          return { objectPath: '/objects/media' };
        },
        useCreateStudioPost: options => {
          mutationOptions = options;
          return { isPending: false, mutateAsync: async input => {
            posts.push(input);
            if (failPost) {
              const error = new Error('timed out');
              mutationOptions.mutation.onError(error);
              throw error;
            }
            mutationOptions.mutation.onSuccess({ id: 2, ...input.data });
          } };
        },
      };
      if (name === 'react-native-keyboard-controller') return { KeyboardAvoidingView: 'KeyboardAvoidingView' };
      if (name === './(tabs)/workshops' || name === './(tabs)/challenges') return { default: 'EmbeddedScreen', __esModule: true };
      if (name === '@/components/KeyboardAwareScrollViewCompat') return { KeyboardAwareScrollViewCompat: 'KeyboardAwareScrollViewCompat' };
      if (name.startsWith('@/components/')) return { default: name.split('/').pop(), __esModule: true };
      throw new Error(`Unexpected dependency ${name}`);
    },
  };
  vm.runInNewContext(compile('../app/feed.tsx'), sandbox);
  function render() {
    stateIndex = refIndex = 0;
    tree = sandbox.exports.default({});
  }
  function nodes(node, match, found = []) {
    if (Array.isArray(node)) node.forEach(n => nodes(n, match, found));
    else if (node && typeof node === 'object') {
      if (match(node)) found.push(node);
      nodes(node.props?.children, match, found);
    }
    return found;
  }
  const node = id => nodes(tree, n => n.props?.testID === id)[0];
  render();
  return {
    render, node, uploads, posts, alerts,
    async pick() {
      const pickers = nodes(tree, n => n.props?.onPress?.name === ({
        image: 'handlePickImage', video: 'handlePickVideo', audio: 'handlePickAudio',
      })[kind]);
      await pickers[0].props.onPress();
      render();
    },
    modal: () => nodes(tree, n => n.type === 'Modal')[0],
    previewTypes: () => nodes(node('compose-media-preview'), () => true).map(n => n.type),
  };
}

test('photo framing defaults to portrait; changing format previews locally and confirmation keeps the choice', async () => {
  const h = harness('image');
  await h.pick();
  assert.equal(h.node('compose-format-portrait').props.accessibilityState.selected, true);
  h.node('compose-format-square').props.onPress();
  h.render();
  assert.equal(h.node('compose-format-square').props.accessibilityState.selected, true);
  h.node('compose-format-landscape').props.onPress();
  h.render();
  assert.equal(h.node('compose-format-landscape').props.accessibilityState.selected, true);
  assert.equal(h.uploads.length + h.posts.length, 0);
  h.node('compose-caption').props.onChangeText('Wide artwork');
  h.render();
  await h.node('compose-confirm').props.onPress();
  assert.equal(h.uploads.length, 1);
  assert.equal(h.uploads[0].media.photoFormat, 'landscape');
});

test('photo crop selection is discarded on Cancel and never appears for video or audio', async () => {
  const h = harness('image');
  await h.pick();
  h.node('compose-format-square').props.onPress();
  h.render();
  h.node('compose-cancel').props.onPress();
  h.render();
  await h.pick();
  assert.equal(h.node('compose-format-portrait').props.accessibilityState.selected, true);
  assert.equal(h.uploads.length + h.posts.length, 0);
  for (const kind of ['video', 'audio']) {
    const other = harness(kind);
    await other.pick();
    assert.equal(other.node('compose-format-portrait'), undefined);
  }
});

for (const kind of ['image', 'video', 'audio']) {
  test(`${kind}: selection opens local preview; only confirmation uploads and publishes edited fields`, async () => {
    const h = harness(kind);
    await h.pick();
    assert.equal(h.modal().props.visible, true);
    assert.ok(h.previewTypes().includes({ image: 'Image', video: 'ComposerVideoPreview', audio: 'AudioTrackPlayer' }[kind]));
    assert.equal(h.uploads.length, 0);
    assert.equal(h.posts.length, 0);
    h.node('compose-caption').props.onChangeText('  My creative practice  ');
    h.node('compose-tags').props.onChangeText('music, practice');
    h.render();
    const confirm = h.node('compose-confirm').props.onPress;
    await Promise.all([confirm(), confirm()]);
    assert.equal(h.uploads.length, 1);
    assert.equal(h.posts.length, 1);
    assert.equal(h.posts[0].data.caption, 'My creative practice');
    assert.equal(h.posts[0].data.mediaType, kind);
    assert.deepEqual(Array.from(h.posts[0].data.tags), ['music', 'practice']);
    h.render();
    assert.equal(h.modal().props.visible, false);
    assert.equal(h.node('compose-caption').props.value, '');
  });
  test(`${kind}: Cancel discards local draft without uploading or publishing`, async () => {
    const h = harness(kind);
    await h.pick();
    h.node('compose-caption').props.onChangeText('private draft');
    h.node('compose-tags').props.onChangeText('private');
    h.render();
    h.node('compose-cancel').props.onPress();
    h.render();
    assert.equal(h.modal().props.visible, false);
    assert.equal(h.node('compose-media-preview'), undefined);
    assert.equal(h.node('compose-caption').props.value, '');
    assert.equal(h.node('compose-tags').props.value, '');
    assert.equal(h.uploads.length + h.posts.length, 0);
  });
}

test('dismissal and picker cancellation cannot publish; blank captions disable confirmation', async () => {
  const h = harness('image');
  await h.pick();
  assert.equal(h.node('compose-confirm').props.disabled, true);
  await h.node('compose-confirm').props.onPress();
  h.modal().props.onRequestClose();
  h.render();
  assert.equal(h.uploads.length + h.posts.length, 0);
  assert.equal(h.modal().props.visible, false);
  const canceled = harness('video', { canceled: true });
  await canceled.pick();
  assert.equal(canceled.modal().props.visible, false);
  assert.equal(canceled.node('compose-media-preview'), undefined);
});

for (const failure of ['failUpload', 'failPost']) {
  test(`${failure}: retains preview and draft, never falls back to caption-only post`, async () => {
    const h = harness('video', { [failure]: true });
    await h.pick();
    h.node('compose-caption').props.onChangeText('Keep this draft');
    h.render();
    await h.node('compose-confirm').props.onPress();
    h.render();
    assert.equal(h.modal().props.visible, true);
    assert.ok(h.node('compose-media-preview'));
    assert.equal(h.node('compose-caption').props.value, 'Keep this draft');
    assert.equal(h.posts.length, failure === 'failUpload' ? 0 : 1);
    assert.ok(h.alerts.length);
  });
}

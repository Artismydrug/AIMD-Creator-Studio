const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');

const compile = path => ts.transpileModule(readFileSync(resolve(__dirname, path), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;

function harness(mediaType = 'image', immersive = true) {
  const states = [];
  let stateIndex = 0, tree;
  const jsx = (type, props) => ({ type, props });
  const api = {
    getBaseUrl: () => 'https://example.invalid',
    useCreateConversation: () => ({}), useFollowUser: () => ({}), useUnfollowUser: () => ({}),
  };
  const native = {
    View: 'View', Text: 'Text', TouchableOpacity: 'TouchableOpacity', Alert: {},
    Platform: { OS: 'ios' }, useWindowDimensions: () => ({ width: 390, height: 650 }),
    StyleSheet: { create: value => value, hairlineWidth: 1, absoluteFillObject: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } },
  };
  const mediaModule = { exports: {}, require: name => {
    if (name === 'react-native') return native;
    if (name === 'expo-file-system/legacy') return {};
    if (name === '@workspace/api-client-react') return api;
    throw new Error(`Unexpected media dependency ${name}`);
  } };
  vm.runInNewContext(compile('../lib/studioMedia.ts'), mediaModule);
  const sandbox = { exports: {}, require(name) {
    if (name === 'react') return {
      memo: component => component,
      useMemo: factory => factory(),
      useCallback: callback => callback,
      useState: initial => {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [states[index], next => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
      },
    };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'Fragment' };
    if (name === 'react-native') return native;
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === '@/hooks/useColors') return { useColors: () => ({ radius: 12 }) };
    if (name === '@expo/vector-icons') return { Feather: 'Feather' };
    if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
    if (name === '@tanstack/react-query') return { useQueryClient: () => ({}) };
    if (name === '@workspace/api-client-react') return api;
    if (name === 'expo-router') return { useRouter: () => ({}) };
    if (name === '@/lib/studioMedia') return mediaModule.exports;
    if (name.startsWith('@/components/')) return { __esModule: true, default: name.split('/').pop() };
    throw new Error(`Unexpected component dependency ${name}`);
  } };
  vm.runInNewContext(compile('../components/PostCard.tsx'), sandbox);
  function render() {
    stateIndex = 0;
    tree = sandbox.exports.default({
      post: { id: 42, userId: 2, imageUrl: '/api/storage/photo', mediaType, caption: 'Artwork', createdAt: new Date().toISOString(), tags: [], followerCount: 0 },
      currentUserId: 1, immersive, active: true, contentTopInset: 80,
    });
  }
  function nodes(node, found = []) {
    if (Array.isArray(node)) node.forEach(child => nodes(child, found));
    else if (node && typeof node === 'object') {
      found.push(node);
      nodes(node.props?.children, found);
    }
    return found;
  }
  render();
  return { render, nodes: () => nodes(tree), photo: () => nodes(tree).find(node => node.type === 'StudioImage') };
}

test('saved portrait, square, and landscape photos restore their framing inside the feed viewport', () => {
  for (const [width, height] of [[1080, 1350], [1080, 1080], [1080, 566]]) {
    const h = harness();
    h.photo().props.onLoadDimensions(width, height);
    h.render();
    const frame = h.photo().props.style;
    assert.ok(Math.abs(frame.width / frame.height - width / height) < 0.001);
    assert.ok(frame.width > 0 && frame.height > 0);
    assert.ok(frame.left >= 0 && frame.top >= 80);
    assert.ok(frame.left + frame.width <= 390.001);
    assert.ok(frame.top + frame.height <= 650 - 150 - 40 + 0.001);
    const footer = h.nodes().find(node => node.props?.onLayout && !node.props.testID);
    footer.props.onLayout({ nativeEvent: { layout: { height: 200 } } });
    h.render();
    const resized = h.photo().props.style;
    assert.ok(resized.top + resized.height <= 650 - 200 - 40 + 0.001);
  }
});

test('non-immersive photo cards use the same saved photo format', () => {
  const h = harness('image', false);
  h.photo().props.onLoadDimensions(1080, 566);
  h.render();
  assert.equal(h.photo().props.style[1].aspectRatio, 1080 / 566);
});

test('video retains a nonzero 9:16 stage and audio keeps its own player', () => {
  const video = harness('video');
  const frame = video.nodes().find(node => node.props?.testID === 'feed-media-frame-42');
  const dimensions = frame.props.style.flat(Infinity).find(style => typeof style?.width === 'number');
  assert.ok(dimensions.height > 0);
  assert.equal(dimensions.width / dimensions.height, 9 / 16);
  assert.equal(video.photo(), undefined);
  const audio = harness('audio');
  assert.ok(audio.nodes().some(node => node.type === 'AudioTrackPlayer'));
  assert.equal(audio.photo(), undefined);
});

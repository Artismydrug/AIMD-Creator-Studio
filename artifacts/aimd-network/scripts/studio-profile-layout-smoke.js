const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');

function load(file, require) {
  const module = { exports: {} };
  const js = ts.transpileModule(readFileSync(resolve(__dirname, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(js, { exports: module.exports, require });
  return module.exports.default;
}
const palettes = load('../constants/colors.ts');
const posts = [1, 2, 3].map((id) => ({
  id, userId: 16, imageUrl: `/art-${id}.jpg`, mediaType: 'image',
  caption: `Artwork ${id}`, tags: [['tattoo'], ['painting'], ['murals']][id - 1],
  createdAt: '2026-10-21T12:00:00Z',
}));
const flattenStyle = (style) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
function allNodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(allNodes);
  if (node.type === 'Modal' && !node.props.visible) return [];
  return [node, ...allNodes(node.props?.children)];
}
const get = (tree, id) => allNodes(tree).find((node) => node.props?.testID === id);

function harness({ width = 390, theme = 'light', ...overrides } = {}) {
  const state = [];
  const calls = { inquiry: 0, edit: 0, follow: 0, message: 0, add: [], links: [] };
  let cursor = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: 'Fragment',
    useMemo: fn => fn(),
    useState(initial) {
      const slot = cursor++;
      if (!(slot in state)) state[slot] = initial;
      return [state[slot], value => { state[slot] = typeof value === 'function' ? value(state[slot]) : value; }];
    },
  };
  const Component = load('../components/CreatorPortfolioView.tsx', (name) => {
    if (name === 'react') return react;
    if (name === 'react-native') return {
      ...Object.fromEntries(['ActivityIndicator', 'Modal', 'Pressable', 'ScrollView', 'Text', 'View'].map(key => [key, key])),
      Alert: { alert() {} }, Linking: { openURL: url => { calls.links.push(url); return Promise.resolve(); } },
      Platform: { OS: 'web' }, StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width }),
    };
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === '@expo/vector-icons') return { Feather: 'Feather' };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (name === '@workspace/api-client-react') return { getBaseUrl: () => 'https://example.test' };
    if (name === '@/hooks/useColors') return { useColors: () => palettes[theme] };
    if (name === '@/lib/studioInquiry') return { normalizeStudioLink: value => value || null };
    if (name.startsWith('@/components/')) return name.split('/').pop();
    throw new Error(`Unexpected dependency: ${name}`);
  });
  const props = {
    creator: { id: 16, username: 'ponchotheartist', bio: 'Artist biography', portfolioUrl: 'https://example.test' },
    posts, isOwner: true, currentUserId: 16, inquiryAvailable: true,
    onInquiry: () => calls.inquiry++, onEdit: () => calls.edit++,
    onFollow: () => calls.follow++, onMessage: () => calls.message++,
    onAddWork: category => calls.add.push(category),
    ...overrides,
  };
  return { calls, render: () => { cursor = 0; return Component(props); } };
}

test('mobile gallery matches two portraits plus a full-width featured third piece', () => {
  for (const width of [320, 375, 390, 430]) {
    const h = harness({ width });
    const tree = h.render();
    const narrow = (width - 36 - 8) / 2;
    assert.equal(flattenStyle(get(tree, 'creator-work-1').props.style).width, narrow);
    assert.equal(flattenStyle(get(tree, 'creator-work-2').props.style).width, narrow);
    assert.equal(flattenStyle(get(tree, 'creator-work-3').props.style).width, width - 36);
    const images = allNodes(tree).filter(node => node.type === 'StudioImage');
    assert.equal(flattenStyle(images[0].props.style).aspectRatio, 4 / 5);
    assert.equal(flattenStyle(images[2].props.style).aspectRatio, 4 / 3);
  }
});

test('wide gallery uses three equal columns without stretching the third image', () => {
  const tree = harness({ width: 1000 }).render();
  for (const id of [1, 2, 3]) {
    assert.equal(flattenStyle(get(tree, `creator-work-${id}`).props.style).width, (680 - 26) / 3);
  }
});

test('pills filter artwork and New work preserves the selected category', () => {
  const h = harness();
  get(h.render(), 'creator-work-filter-painting').props.onPress();
  const filtered = h.render();
  assert.ok(get(filtered, 'creator-work-2'));
  assert.equal(get(filtered, 'creator-work-1'), undefined);
  get(filtered, 'creator-profile-add-work').props.onPress();
  assert.deepEqual(h.calls.add, ['painting']);
});

test('header and bottom inquiry buttons use the existing form handler; editing and visitor controls survive', () => {
  const h = harness();
  const tree = h.render();
  get(tree, 'creator-profile-inquiry').props.onPress();
  get(tree, 'creator-profile-inquiry-bottom').props.onPress();
  get(tree, 'edit-profile-navigation').props.onPress();
  assert.equal(h.calls.inquiry, 2);
  assert.equal(h.calls.edit, 1);
  assert.equal(h.calls.links.length, 0, 'primary inquiry buttons must not open the booking website');
  get(tree, 'creator-website-link').props.onPress();
  get(tree, 'creator-instagram-link').props.onPress();
  get(tree, 'creator-direct-booking').props.onPress();
  assert.deepEqual(h.calls.links, ['https://example.test', 'https://www.instagram.com/ponchotheartist/', 'https://ponchotheartist.com/booking/']);
  const visitor = harness({ isOwner: false });
  const publicTree = visitor.render();
  assert.equal(get(publicTree, 'edit-profile-navigation'), undefined);
  assert.equal(get(publicTree, 'creator-profile-add-work'), undefined);
  get(publicTree, 'creator-profile-follow').props.onPress();
  get(publicTree, 'creator-profile-message').props.onPress();
  assert.equal(visitor.calls.follow, 1);
  assert.equal(visitor.calls.message, 1);
  const closed = harness({ inquiryAvailable: false }).render();
  assert.equal(get(closed, 'creator-profile-inquiry'), undefined);
  assert.equal(get(closed, 'creator-contact-block'), undefined);
});

test('image-first tiles open uncropped artwork with its caption and close back to the grid', () => {
  const h = harness();
  get(h.render(), 'creator-artwork-1').props.onPress();
  const preview = get(h.render(), 'creator-artwork-preview');
  assert.ok(preview);
  assert.equal(allNodes(preview).find(node => node.type === 'StudioImage').props.contentFit, 'contain');
  assert.ok(allNodes(preview).some(node => node.type === 'Text' && node.props.children.includes('Artwork 1')));
  get(preview, 'creator-artwork-close').props.onPress();
  assert.equal(get(h.render(), 'creator-artwork-preview'), undefined);
});

test('Poncho retains his known website without a saved URL; other members do not inherit his links', () => {
  const poncho = harness({ creator: { id: 16, username: 'ponchotheartist' } });
  get(poncho.render(), 'creator-website-link').props.onPress();
  assert.deepEqual(poncho.calls.links, ['https://ponchotheartist.com']);
  const member = harness({ creator: { id: 999, username: 'studio-member' } }).render();
  assert.equal(get(member, 'creator-website-link'), undefined);
  assert.equal(get(member, 'creator-instagram-link'), undefined);
  assert.equal(get(member, 'creator-direct-booking'), undefined);
});

test('studio combines discipline and location, moves owner controls, and relocates profile counts below artwork', () => {
  const h = harness({ creator: { id: 16, username: 'ponchotheartist', discipline: 'Tattooing', location: 'Los Angeles' } });
  const tree = h.render();
  assert.equal(get(tree, 'creator-profile-label').props.children[0], 'TATTOOING · Los Angeles');
  const text = allNodes(tree).filter(node => node.type === 'Text').flatMap(node => node.props.children).join(' ');
  assert.doesNotMatch(text, /SELECTED WORK|Made to stay with you\./);
  const add = get(tree, 'creator-profile-add-work');
  assert.equal(flattenStyle(add.props.style).width, 44, 'icon-only control retains a 44px touch target');
  assert.equal(flattenStyle(add.props.style).height, 44);
  assert.equal(allNodes(add).find(node => node.type === 'Feather').props.name, 'plus');
  add.props.onPress();
  assert.deepEqual(h.calls.add, ['all']);

  const ownerLinks = allNodes(get(tree, 'creator-profile-owner-links'));
  const instagramIndex = ownerLinks.findIndex(node => node.props?.testID === 'creator-instagram-link');
  const editIndex = ownerLinks.findIndex(node => node.props?.testID === 'edit-profile-navigation');
  assert.ok(instagramIndex >= 0 && editIndex > instagramIndex, 'Edit Profile follows Instagram in the same link row');
  get(tree, 'edit-profile-navigation').props.onPress();
  assert.equal(h.calls.edit, 1);
  const nodes = allNodes(tree);
  const gridIndex = nodes.findIndex(node => node.props?.testID === 'creator-work-grid');
  const statsIndex = nodes.findIndex(node => node.props?.testID === 'creator-profile-stats');
  assert.ok(statsIndex > gridIndex, 'work, follower, and following counts sit below the gallery');

  const locationOnly = harness({ creator: { id: 99, username: 'member', location: 'Los Angeles' } }).render();
  assert.equal(get(locationOnly, 'creator-profile-label').props.children[0], 'Los Angeles');
});

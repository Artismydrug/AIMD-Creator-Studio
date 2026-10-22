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
  portfolioCategoryId: null,
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
  const calls = { inquiry: 0, edit: 0, follow: 0, message: 0, add: [], links: [], savedCategories: [], assignments: [] };
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
      ...Object.fromEntries(['ActivityIndicator', 'Modal', 'Pressable', 'ScrollView', 'Text', 'TextInput', 'View'].map(key => [key, key])),
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
    onAddWork: (...args) => calls.add.push(args),
    onSaveCategories: async categories => {
      calls.savedCategories.push(categories);
      return categories.map((category, position) => ({
        id: category.id ?? 100 + position,
        name: category.name.trim(),
        position,
      }));
    },
    onAssignWorkCategory: async (postId, categoryId) => calls.assignments.push([postId, categoryId]),
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

test('category pills filter work, toggle back to every work, and New work preserves the selected category', () => {
  const h = harness();
  const start = h.render();
  assert.equal(get(start, 'creator-work-filter-all-work'), undefined, 'there is no All work pill');
  const paintingTab = get(start, 'creator-work-filter-painting');
  paintingTab.props.onPress();
  const filtered = h.render();
  assert.ok(get(filtered, 'creator-work-2'));
  assert.equal(get(filtered, 'creator-work-1'), undefined);
  get(filtered, 'creator-profile-add-work').props.onPress();
  assert.deepEqual(h.calls.add, [[null, 'Painting']]);
  get(filtered, 'creator-work-filter-painting').props.onPress();
  const allWork = h.render();
  for (const id of [1, 2, 3]) assert.ok(get(allWork, `creator-work-${id}`));
  assert.equal(get(allWork, 'creator-work-filter-painting').props.accessibilityState.selected, false);
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
  assert.equal(get(tree, 'creator-direct-booking'), undefined, 'the profile uses the in-app inquiry form without a second booking link');
  get(tree, 'creator-website-link').props.onPress();
  get(tree, 'creator-instagram-link').props.onPress();
  assert.deepEqual(h.calls.links, ['https://example.test', 'https://www.instagram.com/ponchotheartist/']);
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

test('owner edit and category controls are inside the artwork options sheet, not over gallery tiles', () => {
  const h = harness();
  const grid = h.render();
  assert.equal(get(grid, 'creator-work-category-1'), undefined, 'no tag button overlays artwork');
  assert.equal(
    allNodes(get(grid, 'creator-work-1')).some(node => node.type === 'PostOwnerActions'),
    false,
    'the three-dot menu does not sit on gallery artwork',
  );
  get(grid, 'creator-artwork-1').props.onPress();
  const preview = h.render();
  const ownerActions = allNodes(get(preview, 'creator-artwork-preview')).find(node => node.type === 'PostOwnerActions');
  assert.ok(ownerActions, 'owner menu is available inside the opened artwork preview');
  assert.equal(ownerActions.props.post.id, 1);
  assert.equal(typeof ownerActions.props.onAssignCategory, 'function', 'category assignment remains available from the edit menu');
  ownerActions.props.onAssignCategory();
  assert.ok(get(h.render(), 'creator-work-category-picker'));
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

test('studio combines discipline and location, keeps owner links in one row, and places counts above artwork', () => {
  const h = harness({ creator: { id: 16, username: 'ponchotheartist', discipline: 'Tattooing', location: 'Los Angeles' } });
  const tree = h.render();
  assert.equal(get(tree, 'creator-profile-label').props.children[0], 'TATTOOING · Los Angeles');
  const text = allNodes(tree).filter(node => node.type === 'Text').flatMap(node => node.props.children).join(' ');
  assert.doesNotMatch(text, /SELECTED WORK|Made to stay with you\./);
  const add = get(tree, 'creator-profile-add-work');
  assert.equal(flattenStyle(add.props.style).width, 44, 'icon-only control retains a 44px touch target');
  assert.equal(flattenStyle(add.props.style).height, 44);
  assert.equal(allNodes(add).find(node => node.type === 'Feather').props.name, 'plus');
  const headerControls = allNodes(tree).filter(node => ['creator-profile-inquiry', 'creator-profile-add-work'].includes(node.props?.testID));
  assert.deepEqual(headerControls.map(node => node.props.testID), ['creator-profile-inquiry', 'creator-profile-add-work']);
  add.props.onPress();
  assert.deepEqual(h.calls.add, [[null, undefined]]);

  const ownerLinks = allNodes(get(tree, 'creator-profile-owner-links'));
  const instagramIndex = ownerLinks.findIndex(node => node.props?.testID === 'creator-instagram-link');
  const editIndex = ownerLinks.findIndex(node => node.props?.testID === 'edit-profile-navigation');
  const ownerLinksScroll = get(tree, 'creator-profile-owner-links');
  assert.equal(ownerLinksScroll.props.horizontal, true, 'owner links stay on one horizontal row on narrow screens');
  const websiteIndex = ownerLinks.findIndex(node => node.props?.testID === 'creator-website-link');
  assert.ok(websiteIndex >= 0 && instagramIndex > websiteIndex && editIndex > instagramIndex, 'website, Instagram, and Edit Profile stay in order on one row');
  const edit = get(tree, 'edit-profile-navigation');
  assert.equal(allNodes(edit).filter(node => node.type === 'Text').length, 0, 'Edit Profile is icon-only');
  edit.props.onPress();
  assert.equal(h.calls.edit, 1);
  const nodes = allNodes(tree);
  const tabsIndex = nodes.findIndex(node => node.props?.testID === 'creator-work-tabs');
  const statsIndex = nodes.findIndex(node => node.props?.testID === 'creator-profile-stats');
  const gridIndex = nodes.findIndex(node => node.props?.testID === 'creator-work-grid');
  assert.ok(statsIndex < tabsIndex && tabsIndex < gridIndex, 'work, follower, and following counts sit above filters and artwork');

  const locationOnly = harness({ creator: { id: 99, username: 'member', location: 'Los Angeles' } }).render();
  assert.equal(get(locationOnly, 'creator-profile-label').props.children[0], 'Los Angeles');
});

test('owners can rename, reorder, add, and remove category tabs without deleting work', async () => {
  const h = harness();
  get(h.render(), 'creator-categories-edit').props.onPress();
  const editor = h.render();
  assert.ok(get(editor, 'creator-category-editor'));
  get(editor, 'creator-category-name-0').props.onChangeText('Tattoo Work');
  get(editor, 'creator-category-name-1').props.onChangeText('Painting');
  get(editor, 'creator-category-name-2').props.onChangeText('Murals');
  const renamed = h.render();
  allNodes(renamed).find(node => node.props?.accessibilityLabel === 'Move Tattoo Work down').props.onPress();
  const reordered = h.render();
  get(reordered, 'creator-category-new-name').props.onChangeText('Digital');
  get(h.render(), 'creator-category-add').props.onPress();
  const withNew = h.render();
  get(withNew, 'creator-category-remove-1').props.onPress();
  const afterRemoval = h.render();
  get(afterRemoval, 'creator-categories-save').props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls.savedCategories.length, 1);
  assert.deepEqual(Array.from(h.calls.savedCategories[0], ({ name }) => name), ['Painting', 'Murals', 'Digital']);
  assert.equal(h.calls.savedCategories[0][0].legacyName, 'Painting');
  assert.equal(get(h.render(), 'creator-category-editor'), undefined);
  assert.ok(get(h.render(), 'creator-work-1'), 'removing a category does not delete artwork');
});

test('owners can assign and unassign existing artwork from a category', async () => {
  const h = harness({
    creator: {
      id: 16, username: 'studio-member', portfolioCategories: [
        { id: 21, name: 'Tattoo Work', position: 0 },
      ],
    },
  });
  const grid = h.render();
  get(grid, 'creator-artwork-1').props.onPress();
  const preview = h.render();
  const ownerActions = allNodes(get(preview, 'creator-artwork-preview')).find(node => node.type === 'PostOwnerActions');
  assert.ok(ownerActions);
  ownerActions.props.onAssignCategory();
  const picker = h.render();
  assert.ok(get(picker, 'creator-work-category-picker'));
  get(picker, 'creator-work-category-option-21').props.onPress();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(h.calls.assignments, [[1, 21]]);
  assert.equal(get(h.render(), 'creator-work-category-picker'), undefined);
});

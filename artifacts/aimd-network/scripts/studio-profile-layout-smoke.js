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

test('all artwork remains visible without category filters or management drawers', () => {
  for (const isOwner of [true, false]) {
    const h = harness({
      isOwner,
      creator: {
        id: 16, username: 'studio-member',
        portfolioCategories: [{ id: 21, name: 'Tattoos', position: 0 }],
      },
    });
    const tree = h.render();
    for (const id of [1, 2, 3]) assert.ok(get(tree, `creator-work-${id}`));
    for (const id of ['creator-work-tabs', 'creator-categories-edit', 'creator-category-editor', 'creator-work-category-picker']) {
      assert.equal(get(tree, id), undefined);
    }
    assert.equal(allNodes(tree).some(node => node.props?.accessibilityRole === 'tab'), false);
    if (isOwner) {
      get(tree, 'creator-profile-add-work').props.onPress();
      assert.deepEqual(h.calls.add, [[]], 'new work is not assigned to a hidden category');
    }
  }
});

test('the inquiry is bottom-only; editing and visitor controls survive', () => {
  const h = harness();
  const tree = h.render();
  assert.equal(get(tree, 'creator-profile-inquiry'), undefined, 'the header has no inquiry action');
  get(tree, 'creator-profile-inquiry-bottom').props.onPress();
  get(tree, 'edit-profile-navigation').props.onPress();
  assert.equal(h.calls.inquiry, 1);
  assert.equal(h.calls.edit, 1);
  assert.equal(h.calls.links.length, 0, 'primary inquiry buttons must not open the booking website');
  assert.equal(get(tree, 'creator-direct-booking'), undefined, 'the profile uses the in-app inquiry form without a second booking link');
  assert.equal(get(tree, 'creator-website-link'), undefined);
  assert.equal(get(tree, 'creator-instagram-link'), undefined);
  const visitor = harness({ isOwner: false });
  const publicTree = visitor.render();
  assert.equal(get(publicTree, 'creator-profile-inquiry'), undefined);
  assert.equal(get(publicTree, 'edit-profile-navigation'), undefined);
  assert.equal(get(publicTree, 'creator-profile-add-work'), undefined);
  assert.equal(get(publicTree, 'creator-profile-follow'), undefined);
  get(publicTree, 'creator-profile-message').props.onPress();
  assert.equal(visitor.calls.follow, 0);
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

test('owner artwork edits stay in the preview without category assignment controls', () => {
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
  assert.equal(ownerActions.props.onAssignCategory, undefined);
  assert.equal(get(h.render(), 'creator-work-category-picker'), undefined);
});

test('owners and visitors see the Following count but no follower count or social links', () => {
  for (const theme of ['light', 'dark']) {
    for (const isOwner of [true, false]) {
      for (const username of ['ponchotheartist', 'studio-member']) {
        const tree = harness({ theme, isOwner, creator: {
          id: 16, username, portfolioUrl: 'https://example.test',
          followerCount: 452, followingCount: 123,
        } }).render();
        const text = allNodes(tree).filter(node => node.type === 'Text').flatMap(node => node.props.children).join(' ');
        assert.match(text, /FOLLOWING/);
        assert.match(text, /123/);
        assert.doesNotMatch(text, /FOLLOWERS|452|Instagram|Website/);
        assert.equal(allNodes(tree).some(node => node.props?.accessibilityRole === 'link'), false);
        assert.equal(get(tree, 'creator-profile-follow'), undefined);
      }
    }
  }
});

test('studio keeps specialization below the name, Following above the unified grid, and inquiry near the portfolio', () => {
  const h = harness({ creator: { id: 16, username: 'ponchotheartist', discipline: 'Tattooing', location: 'Los Angeles', followingCount: 4 } });
  const tree = h.render();
  assert.equal(get(tree, 'creator-profile-label').props.children[0], 'Tattooing · Los Angeles');
  const heroTexts = allNodes(tree).filter(node => node.type === 'Text').flatMap(node => node.props.children);
  assert.ok(heroTexts.indexOf('Edward ‘Poncho’ Davila') < heroTexts.indexOf('Tattooing · Los Angeles'));
  const text = allNodes(tree).filter(node => node.type === 'Text').flatMap(node => node.props.children).join(' ');
  assert.doesNotMatch(text, /SELECTED WORK|Made to stay with you\./);
  const add = get(tree, 'creator-profile-add-work');
  assert.equal(flattenStyle(add.props.style).width, 44, 'icon-only control retains a 44px touch target');
  assert.equal(flattenStyle(add.props.style).height, 44);
  assert.equal(allNodes(add).find(node => node.type === 'Feather').props.name, 'plus');
  const headerControls = allNodes(tree).filter(node => ['creator-profile-inquiry', 'creator-profile-add-work'].includes(node.props?.testID));
  assert.deepEqual(headerControls.map(node => node.props.testID), ['creator-profile-add-work']);
  add.props.onPress();
  assert.deepEqual(h.calls.add, [[]]);

  const ownerLinks = allNodes(get(tree, 'creator-profile-owner-links'));
  const editIndex = ownerLinks.findIndex(node => node.props?.testID === 'edit-profile-navigation');
  assert.ok(editIndex >= 0);
  assert.equal(flattenStyle(get(tree, 'creator-profile-owner-links').props.style).flexDirection, 'row');
  const edit = get(tree, 'edit-profile-navigation');
  assert.equal(allNodes(edit).filter(node => node.type === 'Text').length, 0, 'Edit Profile is icon-only');
  edit.props.onPress();
  assert.equal(h.calls.edit, 1);
  const nodes = allNodes(tree);
  const statsIndex = nodes.findIndex(node => node.props?.testID === 'creator-profile-stats');
  const gridIndex = nodes.findIndex(node => node.props?.testID === 'creator-work-grid');
  assert.ok(statsIndex < gridIndex, 'the works count sits directly above artwork');
  const inquiryIndex = nodes.findIndex(node => node.props?.testID === 'creator-contact-block');
  const finalWorkIndex = nodes.findIndex(node => node.props?.testID === 'creator-work-3');
  assert.ok(statsIndex < gridIndex && gridIndex < finalWorkIndex && finalWorkIndex < inquiryIndex, 'the inquiry button follows the portfolio gallery');
  assert.equal(get(tree, 'creator-following-stat').props.children[0].props.children[0], 4);
  assert.equal(get(tree, 'creator-work-tabs'), undefined);

  const locationOnly = harness({ creator: { id: 99, username: 'member', location: 'Los Angeles' } }).render();
  assert.equal(get(locationOnly, 'creator-profile-label').props.children[0], 'Los Angeles');
});

test('empty, loading and failed galleries retain a usable studio layout', () => {
  assert.equal(get(harness({ posts: [] }).render(), 'creator-work-grid'), undefined);
  for (const overrides of [{ isLoading: true }, { isError: true }]) {
    const tree = harness(overrides).render();
    assert.ok(get(tree, 'creator-profile-add-work'));
    assert.ok(get(tree, 'edit-profile-navigation'));
    assert.equal(get(tree, 'creator-work-grid'), undefined);
  }
});

test('feed cards have no public engagement counters or like/comment controls', () => {
  const mobile = readFileSync(resolve(__dirname, '../components/PostCard.tsx'), 'utf8');
  const web = readFileSync(resolve(__dirname, '../../aimd-academy/src/pages/StudioLog.tsx'), 'utf8');
  for (const source of [mobile, web]) {
    assert.doesNotMatch(source, /followerCount|followingCount|likeCount|commentCount|useLikeStudioPost|useCreateStudioPostComment/);
  }
});

test('web booking action is after Studio Work, not beside the creator name', () => {
  const source = readFileSync(resolve(__dirname, '../../aimd-academy/src/pages/Profile.tsx'), 'utf8');
  const actions = source.slice(source.indexOf('{/* Actions */}'), source.indexOf('{/* Bio */}'));
  assert.doesNotMatch(actions, /Request Booking/);
  assert.ok(source.indexOf('posts.map') < source.indexOf('!isOwnProfile && user.bookingOpen'));
});

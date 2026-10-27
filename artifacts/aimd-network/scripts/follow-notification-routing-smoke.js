const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = file => readFileSync(resolve(__dirname, file), 'utf8');

test('a follow notification opens the follower creator profile', () => {
  const screen = read('../app/notifications.tsx');
  const creatorProfile = read('../app/creator/[creatorId].tsx');
  assert.match(
    screen,
    /notification\.type === 'follow' && notification\.actor\?\.id[\s\S]*?pathname: '\/creator\/\[creatorId\]'[\s\S]*?creatorId: String\(notification\.actor\.id\)/,
  );
  assert.match(creatorProfile, /<CreatorPortfolioView/);
});

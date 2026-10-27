const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const read = file => readFileSync(resolve(__dirname, file), 'utf8');

test('habit check-ins stay private by default and only publish when opted in', () => {
  const card = read('../components/HabitCard.tsx');
  const studioMedia = read('../lib/studioMedia.ts');
  const storage = read('../../api-server/src/routes/storage.ts');
  assert.match(card, /useState\(false\);\s*const \[sharingToFeed/);
  assert.match(card, /testID=\{`habit-share-to-feed-\$\{habit\.id\}`\}/);
  assert.match(card, /if \(shareToFeed\) void shareHabitCheckIn\(savedLog\.minutesSpent\)/);
  assert.match(card, /uploadStudioMedia\(/);
  assert.match(card, /useCreateStudioPost/);
  assert.match(card, /getListStudioPostsQueryKey\(\{ followingOnly: 'false' \}\)/);
  assert.match(card, /Your habit log remains in your private history/);
  assert.match(card, /Habit saved privately/);
  assert.match(studioMedia, /'X-AIMD-UPLOAD-PURPOSE': 'studio_post'/);
  assert.match(card, /'X-AIMD-UPLOAD-PURPOSE': 'habit_proof'/);
  assert.match(storage, /const isPrivate = isAssignmentFootage \|\| isInstructorFeedback \|\| isHabitProof/);
  assert.match(storage, /isPrivate \? 'private' : 'public'/);
});

test('Habit History reads server-backed logs and immediately caches successful check-ins', () => {
  const habits = read('../app/(tabs)/habits.tsx');
  const card = read('../components/HabitCard.tsx');
  assert.match(habits, /useQueries\(/);
  assert.match(habits, /getListHabitLogsQueryOptions/);
  assert.match(habits, /testID="habit-view-history"/);
  assert.match(habits, /testID="habit-history-list"/);
  assert.match(habits, /PRIVATE/);
  assert.match(card, /getListHabitLogsQueryKey\(\{ habitId: habit\.id, days: 3650 \}\)/);
});

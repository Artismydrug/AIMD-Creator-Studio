import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createReminderEngine, reminderId, validateReminder, type HabitReminder } from './habitReminderEngine';

function fixture() {
  const storage = new Map<string, string>();
  const notifications = new Map<string, HabitReminder>();
  let failWrite = false;
  const engine = createReminderEngine({
    read: async (key) => storage.get(key) ?? null,
    write: async (key, value) => {
      if (failWrite) throw new Error('Storage unavailable');
      storage.set(key, value);
    },
    schedule: async (id, reminder) => { notifications.set(id, reminder); return id; },
    cancel: async (id) => { notifications.delete(id); },
  });
  return { engine, notifications, failWrites: () => { failWrite = true; } };
}
const input = { hour: 8, minute: 0, message: 'Start sketching' };
test('daily settings persist and edits replace the same OS notification', async () => {
  const f = fixture();
  await f.engine.save('creator-a', 12, input);
  await f.engine.save('creator-a', 12, { ...input, hour: 9, minute: 30 });
  assert.equal(f.notifications.size, 1);
  assert.equal(f.notifications.get(reminderId('creator-a', 12))?.hour, 9);
  assert.equal((await f.engine.load('creator-a'))[0].minute, 30);
});
test('different accounts have isolated preferences and identifiers', async () => {
  const f = fixture();
  await f.engine.save('creator-a', 12, input);
  assert.deepEqual(await f.engine.load('creator-b'), []);
  await f.engine.save('creator-b', 12, { ...input, message: 'Vocal practice' });
  await f.engine.remove('creator-a', 12);
  assert.equal(f.notifications.size, 1);
  assert.equal((await f.engine.load('creator-b'))[0].message, 'Vocal practice');
});
test('turning off cancels the alert and missing reminders are safe to remove', async () => {
  const f = fixture();
  await f.engine.remove('creator-a', 12);
  await f.engine.save('creator-a', 12, input);
  await f.engine.remove('creator-a', 12);
  assert.equal(f.notifications.size, 0);
  assert.deepEqual(await f.engine.load('creator-a'), []);
});
test('invalid times and empty messages are rejected', () => {
  for (const invalid of [{ ...input, hour: 24 }, { ...input, minute: 60 }, { ...input, hour: 1.5 }, { ...input, message: ' ' }]) {
    assert.throws(() => validateReminder(invalid));
  }
  assert.equal(validateReminder({ ...input, hour: 0 }).hour, 0);
  assert.equal(validateReminder({ ...input, hour: 23, minute: 59 }).minute, 59);
});
test('a failed edit restores the prior reminder rather than silently changing it', async () => {
  const f = fixture();
  await f.engine.save('creator-a', 12, input);
  f.failWrites();
  await assert.rejects(f.engine.save('creator-a', 12, { ...input, hour: 10 }));
  assert.equal(f.notifications.get(reminderId('creator-a', 12))?.hour, 8);
  assert.equal((await f.engine.load('creator-a'))[0].hour, 8);
});
test('a failed first save leaves no orphan notification', async () => {
  const f = fixture();
  f.failWrites();
  await assert.rejects(f.engine.save('creator-a', 12, input));
  assert.equal(f.notifications.size, 0);
});

export type HabitReminder = {
  habitId: number; hour: number; minute: number; message: string; notificationId: string;
};
export type ReminderInput = Pick<HabitReminder, 'hour' | 'minute' | 'message'>;
export type ReminderDependencies = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  schedule(id: string, reminder: HabitReminder): Promise<string>;
  cancel(id: string): Promise<void>;
};
export const REMINDER_PREFIX = 'aimd-habit:';
export const reminderKey = (owner: string) => `aimd:habit-reminders:${owner}`;
export const reminderId = (owner: string, habitId: number) => `${REMINDER_PREFIX}${encodeURIComponent(owner)}:${habitId}`;

export function validateReminder(input: ReminderInput) {
  if (!Number.isInteger(input.hour) || input.hour < 0 || input.hour > 23 ||
      !Number.isInteger(input.minute) || input.minute < 0 || input.minute > 59) {
    throw new Error('Choose a valid local reminder time.');
  }
  const message = input.message.trim();
  if (!message || message.length > 120) throw new Error('Enter a reminder message of 1–120 characters.');
  return { ...input, message };
}

export function createReminderEngine(deps: ReminderDependencies) {
  const load = async (owner: string): Promise<HabitReminder[]> => {
    const raw = await deps.read(reminderKey(owner));
    if (!raw) return [];
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows)) throw new Error('Saved reminder settings could not be read.');
    return rows.map((row: HabitReminder) => {
      if (!Number.isInteger(row.habitId) || row.habitId < 1 ||
          row.notificationId !== reminderId(owner, row.habitId)) {
        throw new Error('Saved reminder settings are invalid.');
      }
      return { ...row, ...validateReminder(row) };
    });
  };
  const save = async (owner: string, habitId: number, input: ReminderInput) => {
    if (!owner || !Number.isInteger(habitId) || habitId < 1) throw new Error('Sign in and choose a habit first.');
    const valid = validateReminder(input);
    const rows = await load(owner);
    const old = rows.find((r) => r.habitId === habitId);
    const next: HabitReminder = { ...valid, habitId, notificationId: reminderId(owner, habitId) };
    const actualId = await deps.schedule(next.notificationId, next);
    if (actualId !== next.notificationId) {
      await deps.cancel(actualId);
      throw new Error('The device could not replace this reminder safely.');
    }
    try {
      await deps.write(reminderKey(owner), JSON.stringify([...rows.filter((r) => r.habitId !== habitId), next]));
    } catch (error) {
      // Restore the old OS request if persistence fails; otherwise remove the new one.
      if (old) await deps.schedule(old.notificationId, old);
      else await deps.cancel(next.notificationId);
      throw error;
    }
    return next;
  };
  const remove = async (owner: string, habitId: number) => {
    const rows = await load(owner);
    const old = rows.find((r) => r.habitId === habitId);
    if (!old) return;
    await deps.cancel(old.notificationId);
    try {
      await deps.write(reminderKey(owner), JSON.stringify(rows.filter((r) => r.habitId !== habitId)));
    } catch (error) {
      await deps.schedule(old.notificationId, old);
      throw error;
    }
  };
  return { load, save, remove };
}

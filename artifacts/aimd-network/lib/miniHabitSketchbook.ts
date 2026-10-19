export interface MiniHabitSketchbookStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface MiniHabitSketch {
  id: string;
  createdAt: string;
  prompt: string;
  paths: string[];
}

export const MAX_MINI_HABIT_SKETCHES = 30;
export const MINI_HABIT_SKETCHBOOK_FULL = 'MINI_HABIT_SKETCHBOOK_FULL';

const MAX_SKETCH_PATHS = 100;
const MAX_PATH_LENGTH = 50_000;
const MAX_SKETCH_PATH_CHARS = 120_000;

export function miniHabitSketchbookKey(ownerId: string): string {
  if (typeof ownerId !== 'string' || !ownerId.trim() || ownerId.length > 255) {
    throw new Error('Invalid sketchbook account');
  }
  return `aimd:mini-habit-sketchbook:v1:${ownerId}`;
}

function isSketch(value: unknown): value is MiniHabitSketch {
  if (!value || typeof value !== 'object') return false;
  const sketch = value as Partial<MiniHabitSketch>;
  if (
    typeof sketch.id !== 'string' || !sketch.id || sketch.id.length > 120 ||
    typeof sketch.createdAt !== 'string' || !Number.isFinite(Date.parse(sketch.createdAt)) ||
    typeof sketch.prompt !== 'string' || !sketch.prompt || sketch.prompt.length > 180 ||
    !Array.isArray(sketch.paths) || sketch.paths.length > MAX_SKETCH_PATHS
  ) return false;

  let totalPathChars = 0;
  for (const path of sketch.paths) {
    if (typeof path !== 'string' || !path || path.length > MAX_PATH_LENGTH) return false;
    totalPathChars += path.length;
    if (totalPathChars > MAX_SKETCH_PATH_CHARS) return false;
  }
  return true;
}

function validateSketch(sketch: MiniHabitSketch): void {
  if (!isSketch(sketch)) throw new Error('Invalid sketch');
}

/** Serialize operations per account so overlapping saves cannot overwrite each other. */
export function createMiniHabitSketchbook(storage: MiniHabitSketchbookStorage) {
  const queues = new Map<string, Promise<void>>();

  function enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const result = (queues.get(key) ?? Promise.resolve()).then(operation);
    const settled = result.then(() => undefined, () => undefined);
    queues.set(key, settled);
    void settled.then(() => {
      if (queues.get(key) === settled) queues.delete(key);
    });
    return result;
  }

  async function read(key: string): Promise<MiniHabitSketch[]> {
    const raw = await storage.getItem(key);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (
      !Array.isArray(value) ||
      value.length > MAX_MINI_HABIT_SKETCHES ||
      !value.every(isSketch)
    ) {
      throw new Error('Invalid saved sketchbook');
    }
    return value;
  }

  async function write(key: string, sketches: MiniHabitSketch[]): Promise<void> {
    if (sketches.length === 0) {
      await storage.removeItem(key);
      return;
    }
    await storage.setItem(key, JSON.stringify(sketches));
  }

  return {
    load(ownerId: string): Promise<MiniHabitSketch[]> {
      const key = miniHabitSketchbookKey(ownerId);
      return enqueue(key, () => read(key));
    },

    save(ownerId: string, sketch: MiniHabitSketch): Promise<MiniHabitSketch[]> {
      validateSketch(sketch);
      const key = miniHabitSketchbookKey(ownerId);
      return enqueue(key, async () => {
        const saved = await read(key);
        if (saved.some((item) => item.id === sketch.id)) return saved;
        if (saved.length >= MAX_MINI_HABIT_SKETCHES) {
          throw new Error(MINI_HABIT_SKETCHBOOK_FULL);
        }
        const next = [...saved, sketch];
        await write(key, next);
        return next;
      });
    },

    remove(ownerId: string, sketchId: string): Promise<MiniHabitSketch[]> {
      const key = miniHabitSketchbookKey(ownerId);
      return enqueue(key, async () => {
        const saved = await read(key);
        const next = saved.filter((sketch) => sketch.id !== sketchId);
        if (next.length !== saved.length) await write(key, next);
        return next;
      });
    },

    clearAccount(ownerId: string): Promise<void> {
      const key = miniHabitSketchbookKey(ownerId);
      return enqueue(key, () => storage.removeItem(key));
    },
  };
}

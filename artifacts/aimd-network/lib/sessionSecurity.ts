import * as SecureStore from 'expo-secure-store';

export const BIOMETRIC_RESUME_GRACE_MS = 60 * 1000;
export const SESSION_INACTIVITY_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;

export function isSessionInactiveExpired(
  lastActiveAt: number | null,
  now = Date.now(),
): boolean {
  return lastActiveAt !== null && (
    !Number.isFinite(lastActiveAt) ||
    now - lastActiveAt >= SESSION_INACTIVITY_TIMEOUT_MS
  );
}

type SecureKeyValueStore = Pick<
  typeof SecureStore,
  'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'
>;

function createQueueRunner() {
  const queues = new Map<string, Promise<unknown>>();

  return function serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = queues.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    queues.set(key, next);
    const cleanQueue = () => {
      if (queues.get(key) === next) queues.delete(key);
    };
    void next.then(cleanQueue, cleanQueue);
    return next;
  };
}

export function createSessionSecurityStore(storage: SecureKeyValueStore) {
  const serialize = createQueueRunner();
  const listeners = new Set<(userId: string, enabled: boolean) => void>();
  const accountKey = (userId: string, key: string) =>
    `aimd.auth-security.v1.${encodeURIComponent(userId)}.${key}`;
  const accountQueueKey = (userId: string) => accountKey(userId, 'account');

  return {
    subscribe(listener: (userId: string, enabled: boolean) => void): () => void {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    getBiometricEnabled(userId: string): Promise<boolean> {
      const key = accountKey(userId, 'settings');
      return serialize(accountQueueKey(userId), async () => (await storage.getItemAsync(key)) === 'true');
    },

    setBiometricEnabled(userId: string, enabled: boolean): Promise<void> {
      const key = accountKey(userId, 'settings');
      return serialize(accountQueueKey(userId), async () => {
        if (enabled) {
          await storage.setItemAsync(key, 'true');
        } else {
          await storage.deleteItemAsync(key);
        }
        listeners.forEach((listener) => listener(userId, enabled));
      });
    },

    getLastActiveAt(userId: string): Promise<number | null> {
      const key = accountKey(userId, 'last-active');
      return serialize(accountQueueKey(userId), async () => {
        const value = await storage.getItemAsync(key);
        if (value == null) return null;
        const timestamp = Number(value);
        return Number.isFinite(timestamp) ? timestamp : Number.NaN;
      });
    },

    recordActivity(userId: string, timestamp = Date.now()): Promise<void> {
      const key = accountKey(userId, 'last-active');
      return serialize(accountQueueKey(userId), async () => {
        await storage.setItemAsync(key, String(timestamp));
      });
    },

    clearLastActiveAt(userId: string): Promise<void> {
      const key = accountKey(userId, 'last-active');
      return serialize(accountQueueKey(userId), async () => {
        await storage.deleteItemAsync(key);
      });
    },

    clearAccount(userId: string): Promise<void> {
      const settingsKey = accountKey(userId, 'settings');
      const activityKey = accountKey(userId, 'last-active');
      return serialize(accountQueueKey(userId), async () => {
        await Promise.all([
          storage.deleteItemAsync(settingsKey),
          storage.deleteItemAsync(activityKey),
        ]);
        listeners.forEach((listener) => listener(userId, false));
      });
    },
  };
}

export const sessionSecurityStore = createSessionSecurityStore(SecureStore);

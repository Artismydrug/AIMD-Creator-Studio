import * as SecureStore from 'expo-secure-store';

export const BIOMETRIC_RESUME_GRACE_MS = 60 * 1000;

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
  const accountKey = (userId: string, key: string) =>
    `aimd.auth-security.v1.${encodeURIComponent(userId)}.${key}`;

  return {
    getBiometricEnabled(userId: string): Promise<boolean> {
      const key = accountKey(userId, 'settings');
      return serialize(key, async () => (await storage.getItemAsync(key)) === 'true');
    },

    setBiometricEnabled(userId: string, enabled: boolean): Promise<void> {
      const key = accountKey(userId, 'settings');
      return serialize(key, async () => {
        if (enabled) {
          await storage.setItemAsync(key, 'true');
        } else {
          await storage.deleteItemAsync(key);
        }
      });
    },

    clearAccount(userId: string): Promise<void> {
      const key = accountKey(userId, 'settings');
      return serialize(key, async () => storage.deleteItemAsync(key));
    },
  };
}

export const sessionSecurityStore = createSessionSecurityStore(SecureStore);

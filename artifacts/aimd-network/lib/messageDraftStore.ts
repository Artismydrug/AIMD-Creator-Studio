export interface DraftStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface MessageDraft {
  text: string;
  editVersion: number;
  pending?: { clientRequestId: string; content: string };
}

export function messageDraftKey(userId: number, conversationId: number): string {
  return `aimd:message-draft:v1:${userId}:${conversationId}`;
}

/** Serialize reads AND writes per account/conversation, including across mounts. */
export function createMessageDraftStore(storage: DraftStorage) {
  const queues = new Map<string, Promise<void>>();
  function enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const result = (queues.get(key) ?? Promise.resolve()).then(operation);
    const settled = result.then(() => undefined, () => undefined);
    queues.set(key, settled);
    void settled.then(() => { if (queues.get(key) === settled) queues.delete(key); });
    return result;
  }
  async function read(key: string): Promise<MessageDraft> {
    const raw = await storage.getItem(key);
    if (!raw) return { text: '', editVersion: 0 };
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || !('text' in value) || typeof value.text !== 'string') {
      throw new Error('Invalid saved message draft');
    }
    const pending = 'pending' in value ? value.pending : undefined;
    if (pending != null && (typeof pending !== 'object' ||
      !('clientRequestId' in pending) || typeof pending.clientRequestId !== 'string' ||
      !('content' in pending) || typeof pending.content !== 'string')) {
      throw new Error('Invalid saved message request');
    }
    const editVersion = 'editVersion' in value && typeof value.editVersion === 'number' && Number.isSafeInteger(value.editVersion)
      ? value.editVersion : 0;
    return { text: value.text, editVersion, ...(pending ? { pending: pending as MessageDraft['pending'] } : {}) };
  }
  async function write(key: string, draft: MessageDraft) {
    if (!draft.text && !draft.pending) await storage.removeItem(key);
    else await storage.setItem(key, JSON.stringify(draft));
  }
  return {
    load: (key: string) => enqueue(key, () => read(key)),
    saveText: (key: string, text: string) => enqueue(key, async () => {
      const draft = await read(key);
      await write(key, { ...draft, text, editVersion: draft.editVersion + 1 });
    }),
    prepareSend: (key: string, text: string, newId: () => string) => enqueue(key, async () => {
      const draft = await read(key);
      const content = text.trim();
      if (!content) throw new Error('Message is empty');
      const pending = draft.pending?.content === content
        ? draft.pending
        : { clientRequestId: newId(), content };
      // Persist the replay identity BEFORE making a request.
      const editVersion = draft.text === text ? draft.editVersion : draft.editVersion + 1;
      await write(key, { text, pending, editVersion });
      return { key, text, editVersion, ...pending };
    }),
    confirmSend: (key: string, clientRequestId: string, sentText: string, editVersion: number) => enqueue(key, async () => {
      const draft = await read(key);
      // A late response must not clear a newer send or a newer draft.
      if (draft.pending?.clientRequestId !== clientRequestId) return false;
      const clear = draft.text === sentText && draft.editVersion === editVersion;
      await write(key, { text: clear ? '' : draft.text, editVersion: draft.editVersion });
      return clear;
    }),
  };
}

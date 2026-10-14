import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createMessageDraftStore, messageDraftKey } from '@/lib/messageDraftStore';
import { draftAfterConfirmedSend } from '@/lib/messageDraft';

const store = createMessageDraftStore(AsyncStorage);
type Snapshot = { key: string | null; text: string; ready: boolean; error: boolean; revision: number };
type PreparedSend = Awaited<ReturnType<typeof store.prepareSend>> & { revision: number };

export function useMessageDraft(userId: number | undefined, conversationId: number) {
  const key = userId && Number.isSafeInteger(conversationId) && conversationId > 0
    ? messageDraftKey(userId, conversationId) : null;
  const [snapshot, setSnapshot] = useState<Snapshot>({ key: null, text: '', ready: false, error: false, revision: 0 });
  const live = useRef(snapshot);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    live.current = { key, text: '', ready: false, error: false, revision: 0 };
    setSnapshot(live.current);
    if (key) {
      void store.load(key).then((draft) => {
        if (!active) return;
        live.current = { key, text: draft.text, ready: true, error: false, revision: 0 };
        setSnapshot(live.current);
      }).catch(() => {
        if (!active) return;
        live.current = { key, text: '', ready: true, error: true, revision: 0 };
        setSnapshot(live.current);
      });
    }
    return () => { active = false; mounted.current = false; };
  }, [key]);

  const setText = useCallback((next: string | ((current: string) => string)) => {
    const current = live.current;
    if (!mounted.current || current.key !== key || !current.ready || !key) return;
    const text = typeof next === 'function' ? next(current.text) : next;
    live.current = { ...current, text, revision: current.revision + 1 };
    setSnapshot(live.current);
    void store.saveText(key, text).then(() => {
      if (mounted.current && live.current.key === key && live.current.error) {
        live.current = { ...live.current, error: false };
        setSnapshot(live.current);
      }
    }).catch(() => {
      if (mounted.current && live.current.key === key) {
        live.current = { ...live.current, error: true };
        setSnapshot(live.current);
      }
    });
  }, [key]);

  const isCurrent = (savedKey: string) => mounted.current && live.current.key === savedKey;
  return {
    text: snapshot.key === key ? snapshot.text : '',
    ready: snapshot.key === key && snapshot.ready,
    storageError: snapshot.key === key && snapshot.error,
    setText,
    isCurrent,
    prepareSend: async () => {
      if (!key || !isCurrent(key) || !live.current.ready) throw new Error('Draft is not ready');
      const { text, revision } = live.current;
      const sent = await store.prepareSend(key, text, () => Crypto.randomUUID());
      return { ...sent, revision };
    },
    confirmSend: async (sent: PreparedSend) => {
      // Complete storage even when the conversation was closed during the request.
      const cleared = await store.confirmSend(sent.key, sent.clientRequestId, sent.text, sent.editVersion);
      if (cleared && isCurrent(sent.key) && live.current.revision === sent.revision) {
        live.current = { ...live.current, text: draftAfterConfirmedSend(live.current.text, sent.text) };
        setSnapshot(live.current);
      }
    },
  };
}

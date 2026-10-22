import { useEffect, useState } from "react";

// Deliberately separate from app authentication, APIs, and persistent server data.
// Preview "creator" identity is a demo role, not an authenticated real account.
export const SANDBOX_CREATOR_ID = "poncho-preview";
export const sandboxPaths = {
  profile: "/__mockup/preview/artist-portfolio/PonchoPortfolio",
  form: "/__mockup/preview/artist-portfolio/PonchoCommissionInquiry",
  notifications: "/__mockup/preview/artist-portfolio/CreatorInquiryNotifications",
};

export type SandboxReference = {
  id: string;
  name: string;
  type: string;
  blob: Blob;
};

export type SandboxInquiryInput = {
  creatorId: string;
  clientName: string;
  email: string;
  phone: string;
  category: string;
  description: string;
  budget: string;
  timing: string;
  references: SandboxReference[];
};

export type SandboxInquiry = SandboxInquiryInput & {
  id: string;
  notificationId: string;
  createdAt: string;
  readAt: string | null;
};

const DB_NAME = "aimd-sandbox-inquiry-preview-v1";
const STORE = "inquiries";
const CHANGE_EVENT = "aimd-sandbox-inquiries-changed";
const CHANNEL = "aimd-sandbox-inquiries";
let database: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (!database) {
    database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("creatorId", "creatorId");
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => {
          request.result.close();
          database = undefined;
        };
        resolve(request.result);
      };
      request.onerror = () => reject(new Error("Browser storage is unavailable. Your inquiry has not been submitted."));
      request.onblocked = () => reject(new Error("Close other sandbox previews and try again."));
    }).catch((error) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

function announceChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
  // Cross-iframe updates stay on this browser origin; no network message is sent.
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage({ changed: true });
    channel.close();
  }
}

export function inquiryNotificationText(inquiry: SandboxInquiry) {
  return `New Commission Inquiry: ${inquiry.clientName} requested a ${inquiry.category.toLowerCase()} project`;
}

export async function submitSandboxInquiry(
  input: SandboxInquiryInput,
  submissionId: string,
): Promise<SandboxInquiry> {
  if (!input.clientName.trim() || !input.email.trim() || !input.description.trim()) {
    throw new Error("Add your name, email, and project idea before submitting.");
  }
  const db = await openDatabase();
  const inquiry: SandboxInquiry = {
    ...input,
    clientName: input.clientName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    description: input.description.trim(),
    id: submissionId,
    notificationId: `inquiry-${submissionId}`,
    createdAt: new Date().toISOString(),
    readAt: null,
  };
  const saved = await new Promise<SandboxInquiry>((resolve, reject) => {
    // The inquiry and its notification are one atomic record. Retries reuse the ID.
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    let result = inquiry;
    const existing = store.get(submissionId);
    existing.onsuccess = () => {
      if (existing.result) result = existing.result as SandboxInquiry;
      else store.add(inquiry);
    };
    transaction.oncomplete = () => resolve(result);
    transaction.onabort = transaction.onerror = () =>
      reject(new Error("Could not save this preview inquiry. Your form is still here; please try again."));
  });
  announceChange();
  return saved;
}

async function listInquiries(creatorId: string): Promise<SandboxInquiry[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).index("creatorId").getAll(creatorId);
    transaction.oncomplete = () => resolve(
      (request.result as SandboxInquiry[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
    transaction.onabort = transaction.onerror = () => reject(new Error("Could not load preview notifications."));
  });
}

export async function markSandboxInquiryRead(id: string, creatorId: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    const request = store.get(id);
    request.onsuccess = () => {
      const inquiry = request.result as SandboxInquiry | undefined;
      if (!inquiry || inquiry.creatorId !== creatorId) {
        transaction.abort();
        return;
      }
      if (!inquiry.readAt) store.put({ ...inquiry, readAt: new Date().toISOString() });
    };
    transaction.oncomplete = () => resolve();
    transaction.onabort = transaction.onerror = () => reject(new Error("Could not mark this inquiry as read."));
  });
  announceChange();
}

export function useSandboxInquiries(creatorId: string) {
  const [inquiries, setInquiries] = useState<SandboxInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let revision = 0;
    const refresh = async () => {
      const requestRevision = ++revision;
      try {
        const next = await listInquiries(creatorId);
        if (active && requestRevision === revision) {
          setInquiries(next);
          setError("");
        }
      } catch (cause) {
        if (active && requestRevision === revision) setError(
          cause instanceof Error ? cause.message : "Could not load preview notifications.",
        );
      } finally {
        if (active && requestRevision === revision) setLoading(false);
      }
    };
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL) : null;
    if (channel) channel.onmessage = refresh;
    window.addEventListener(CHANGE_EVENT, refresh);
    window.addEventListener("focus", refresh);
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    void refresh();
    return () => {
      active = false;
      channel?.close();
      window.removeEventListener(CHANGE_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [creatorId]);
  return { inquiries, unreadCount: inquiries.filter((item) => !item.readAt).length, loading, error };
}

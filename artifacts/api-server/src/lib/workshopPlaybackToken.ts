import { createHmac, timingSafeEqual } from "node:crypto";

export type WorkshopPlaybackScope = {
  userId: number;
  workshopId: number;
  moduleId: number;
};

type WorkshopPlaybackPayload = WorkshopPlaybackScope & {
  version: 1;
  expiresAt: number;
};

const TOKEN_TTL_MAX_SECONDS = 10 * 60;
const TOKEN_PURPOSE = "aimd-workshop-playback-token-v1";

function signingKey(secret: string): Buffer {
  return createHmac("sha256", secret).update(TOKEN_PURPOSE).digest();
}

function decodePayload(segment: string): WorkshopPlaybackPayload | null {
  try {
    const value = JSON.parse(Buffer.from(segment, "base64url").toString("utf8")) as Partial<WorkshopPlaybackPayload>;
    if (
      value.version !== 1 ||
      !Number.isSafeInteger(value.userId) ||
      !Number.isSafeInteger(value.workshopId) ||
      !Number.isSafeInteger(value.moduleId) ||
      !Number.isSafeInteger(value.expiresAt)
    ) return null;
    return value as WorkshopPlaybackPayload;
  } catch {
    return null;
  }
}

export function createWorkshopPlaybackToken(
  scope: WorkshopPlaybackScope,
  ttlSeconds: number,
  secret = process.env.SESSION_SECRET,
  nowMs = Date.now(),
): string {
  if (!secret) throw new Error("Playback signing is unavailable");
  if (
    !Number.isSafeInteger(scope.userId) || scope.userId < 1 ||
    !Number.isSafeInteger(scope.workshopId) || scope.workshopId < 1 ||
    !Number.isSafeInteger(scope.moduleId) || scope.moduleId < 1 ||
    !Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > TOKEN_TTL_MAX_SECONDS
  ) throw new Error("Invalid playback token scope");

  const payload: WorkshopPlaybackPayload = {
    ...scope,
    version: 1,
    expiresAt: Math.floor(nowMs / 1000) + ttlSeconds,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", signingKey(secret)).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifyWorkshopPlaybackToken(
  token: string | undefined,
  expectedScope: WorkshopPlaybackScope,
  secret = process.env.SESSION_SECRET,
  nowMs = Date.now(),
): boolean {
  if (!secret || !token || token.length > 2048) return false;
  const segments = token.split(".");
  if (segments.length !== 2 || !segments[0] || !segments[1]) return false;

  const actualSignature = Buffer.from(segments[1], "base64url");
  const expectedSignature = createHmac("sha256", signingKey(secret)).update(segments[0]).digest();
  if (actualSignature.length !== expectedSignature.length || !timingSafeEqual(actualSignature, expectedSignature)) return false;

  const payload = decodePayload(segments[0]);
  if (!payload) return false;
  const nowSeconds = Math.floor(nowMs / 1000);
  return payload.userId === expectedScope.userId &&
    payload.workshopId === expectedScope.workshopId &&
    payload.moduleId === expectedScope.moduleId &&
    payload.expiresAt > nowSeconds &&
    payload.expiresAt <= nowSeconds + TOKEN_TTL_MAX_SECONDS;
}

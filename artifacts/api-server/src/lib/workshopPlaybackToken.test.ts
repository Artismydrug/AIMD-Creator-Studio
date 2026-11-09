import { describe, expect, it } from "vitest";
import { createWorkshopPlaybackToken, verifyWorkshopPlaybackToken } from "./workshopPlaybackToken";

const secret = "workshop-playback-test-secret-that-is-long-enough";
const scope = { userId: 11, workshopId: 22, moduleId: 33 };
const now = 1_800_000_000_000;

describe("workshop playback tokens", () => {
  it("binds a short-lived token to one user and lesson", () => {
    const token = createWorkshopPlaybackToken(scope, 300, secret, now);
    expect(verifyWorkshopPlaybackToken(token, scope, secret, now)).toBe(true);
    expect(verifyWorkshopPlaybackToken(token, { ...scope, userId: 12 }, secret, now)).toBe(false);
    expect(verifyWorkshopPlaybackToken(token, { ...scope, moduleId: 34 }, secret, now)).toBe(false);
    expect(verifyWorkshopPlaybackToken(token, { ...scope, workshopId: 23 }, secret, now)).toBe(false);
  });

  it("rejects expired, modified, malformed, and overlong tokens", () => {
    const token = createWorkshopPlaybackToken(scope, 60, secret, now);
    expect(verifyWorkshopPlaybackToken(token, scope, secret, now + 60_000)).toBe(false);
    expect(verifyWorkshopPlaybackToken(`${token}x`, scope, secret, now)).toBe(false);
    expect(verifyWorkshopPlaybackToken("not-a-token", scope, secret, now)).toBe(false);
    expect(verifyWorkshopPlaybackToken("x".repeat(2049), scope, secret, now)).toBe(false);
  });

  it("rejects issuance without a secret and invalid TTLs", () => {
    expect(() => createWorkshopPlaybackToken(scope, 300, "", now)).toThrow();
    expect(() => createWorkshopPlaybackToken(scope, 601, secret, now)).toThrow();
  });
});

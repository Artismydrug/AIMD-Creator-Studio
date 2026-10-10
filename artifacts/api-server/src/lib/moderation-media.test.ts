import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectNotFoundError, ObjectStorageService } from "./objectStorage";

const acl = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("./objectAcl", async () => ({
  ...await vi.importActual<typeof import("./objectAcl")>("./objectAcl"),
  getObjectAclPolicy: acl.get,
  setObjectAclPolicy: acl.set,
}));
const service = new ObjectStorageService();
const file = {} as Awaited<ReturnType<ObjectStorageService["getObjectEntityFile"]>>;

beforeEach(() => {
  acl.get.mockReset();
  acl.set.mockReset().mockResolvedValue(undefined);
  vi.spyOn(service, "getObjectEntityFile").mockResolvedValue(file);
});
afterEach(() => vi.restoreAllMocks());

describe("moderation media withdrawal", () => {
  it("makes owned media private without preserving other access rules", async () => {
    acl.get.mockResolvedValue({ owner: "42", visibility: "public", aclRules: [] });
    await service.revokePublicObjectEntityIfOwned("/api/storage/objects/uploads/fixture", "42");
    expect(service.getObjectEntityFile).toHaveBeenCalledWith("/objects/uploads/fixture");
    expect(acl.set).toHaveBeenCalledWith(file, { owner: "42", visibility: "private" });
  });
  it("never withdraws a different creator's media", async () => {
    acl.get.mockResolvedValue({ owner: "99", visibility: "public" });
    await service.revokePublicObjectEntityIfOwned("/objects/uploads/fixture", "42");
    expect(acl.set).not.toHaveBeenCalled();
  });
  it("does not fetch arbitrary external URLs or modify shared public assets", async () => {
    for (const path of ["https://example.com/file.png", "/api/storage/public-objects/logo.png"]) {
      await service.revokePublicObjectEntityIfOwned(path, "42");
    }
    expect(service.getObjectEntityFile).not.toHaveBeenCalled();
  });
  it("treats an already missing object as withdrawn", async () => {
    vi.mocked(service.getObjectEntityFile).mockRejectedValue(new ObjectNotFoundError());
    await expect(service.revokePublicObjectEntityIfOwned("/objects/uploads/missing", "42")).resolves.toBeUndefined();
    expect(acl.set).not.toHaveBeenCalled();
  });
  it("propagates provider failures so staff cannot receive a false success", async () => {
    acl.get.mockResolvedValue({ owner: "42", visibility: "public" });
    acl.set.mockRejectedValue(new Error("Unavailable"));
    await expect(service.revokePublicObjectEntityIfOwned("/objects/uploads/fixture", "42")).rejects.toThrow("Unavailable");
  });
});

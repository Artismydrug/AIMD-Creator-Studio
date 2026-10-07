import { and, eq, isNotNull } from "drizzle-orm";
import { db, workshopVideoUploadsTable } from "@workspace/db";

export function workshopMediaObjectPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const path = url.startsWith("/api/storage/") ? url.slice("/api/storage".length) : url;
  return /^\/objects\/uploads\/[a-f0-9-]{36}$/.test(path) ? path : null;
}

export async function isValidWorkshopMediaReference(
  url: string | null | undefined,
  workshopId: number,
  kind: "preview" | "lesson",
): Promise<boolean> {
  if (!url) return true;
  const path = workshopMediaObjectPath(url);
  if (!path) return false;
  const [upload] = await db.select({ id: workshopVideoUploadsTable.id }).from(workshopVideoUploadsTable).where(and(
    eq(workshopVideoUploadsTable.workshopId, workshopId),
    eq(workshopVideoUploadsTable.mediaPath, path),
    eq(workshopVideoUploadsTable.kind, kind),
    isNotNull(workshopVideoUploadsTable.readyAt),
  ));
  return !!upload;
}

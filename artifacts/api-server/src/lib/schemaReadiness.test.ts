import { describe, expect, it, vi } from "vitest";
import { pool } from "@workspace/db";
import { requiredApplicationColumns, verifyApplicationSchema } from "./schemaReadiness";

function metadata() {
  return [...requiredApplicationColumns()].flatMap(([table_name, columns]) =>
    [...columns].map((column_name) => ({ table_name, column_name })),
  );
}

describe("read-only production schema validation", () => {
  it("accepts complete schema without issuing DDL or data writes", async () => {
    const query = vi.fn().mockResolvedValue({ rows: metadata() });
    await verifyApplicationSchema({ query } as unknown as typeof pool);
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toMatch(/^SELECT /);
  });

  it("fails explicitly on missing tables/columns rather than trying startup repairs", async () => {
    const query = vi.fn().mockResolvedValue({
      rows: metadata().filter((row) => row.table_name !== "habits" || row.column_name !== "user_id"),
    });
    await expect(verifyApplicationSchema({ query } as unknown as typeof pool)).rejects.toThrow("habits.user_id");
    expect(query).toHaveBeenCalledTimes(1);
  });
});

import { getTableColumns, getTableName, is } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import * as schema from "@workspace/db";

export function requiredApplicationColumns(): Map<string, Set<string>> {
  const required = new Map<string, Set<string>>();
  for (const value of Object.values(schema)) {
    if (is(value, PgTable)) {
      required.set(getTableName(value), new Set(Object.values(getTableColumns(value)).map((column) => column.name)));
    }
  }
  return required;
}

/** Published schema is provisioned by Publish, never by a production replica. */
export async function verifyApplicationSchema(database = schema.pool): Promise<void> {
  const { rows } = await database.query<{ table_name: string; column_name: string }>(
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'",
  );
  const existing = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!existing.has(row.table_name)) existing.set(row.table_name, new Set());
    existing.get(row.table_name)!.add(row.column_name);
  }
  const missing: string[] = [];
  for (const [table, columns] of requiredApplicationColumns()) {
    for (const column of columns) {
      if (!existing.get(table)?.has(column)) missing.push(`${table}.${column}`);
    }
  }
  if (missing.length) throw new Error(`Application schema is incomplete: ${missing.join(", ")}. Apply the development schema and re-publish.`);
}

import { sql, type SQLWrapper } from "drizzle-orm";

// Legacy, unclaimed sample profiles. Never hide a profile once a real identity
// is linked, and never classify genuine users by a vague "test" name pattern.
const legacySampleNames = [
  "Alex Rivera", "Maya Chen", "Jordan Lee", "Sam Torres", "Dani Reyes",
  "Marcus Bell", "Yuki Tanaka", "Priya Saunders", "Leon Baptiste", "Asha Okafor",
];

export function communityMemberVisibility(fields: {
  username: SQLWrapper;
  clerkId: SQLWrapper;
  replitId: SQLWrapper;
}) {
  return sql<boolean>`NOT (
    NULLIF(${fields.clerkId}, '') IS NULL
    AND NULLIF(${fields.replitId}, '') IS NULL
    AND ${fields.username} IN (${sql.join(legacySampleNames.map((name) => sql`${name}`), sql`, `)})
  )`;
}

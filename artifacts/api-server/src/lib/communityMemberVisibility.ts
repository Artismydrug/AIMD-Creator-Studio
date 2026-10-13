import { sql, type SQLWrapper } from "drizzle-orm";

// Legacy, unclaimed sample profiles. Never hide a profile once a real identity
// is linked, and never classify genuine users by a vague "test" name pattern.
const legacySampleNames = [
  "Alex Rivera", "Maya Chen", "Jordan Lee", "Sam Torres", "Dani Reyes",
  "Marcus Bell", "Yuki Tanaka", "Priya Saunders", "Leon Baptiste", "Asha Okafor",
];

// Exact, system-generated prefixes used by automated account and integration
// tests. Keep this filter directory-only; a vague "test" substring can be a
// genuine creator's handle.
const automatedDirectoryHandlePrefixes = [
  "clerk_test_",
  "account_delete_",
  "reflection_instructor_",
  "social_recipient_",
  "social_sender_",
  "test_user_",
  "test_account_",
  "mock_user_",
  "mock_account_",
  "automated_test_",
  "e2e_test_",
  "playwright_test_",
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

export function communityDirectoryAccountVisibility(username: SQLWrapper) {
  const normalizedUsername = sql`lower(trim(both '@' from btrim(${username})))`;
  const automatedHandleChecks = automatedDirectoryHandlePrefixes.map(
    (prefix) => sql`left(${normalizedUsername}, char_length(${prefix})) = ${prefix}`,
  );
  return sql<boolean>`NOT (${sql.join(automatedHandleChecks, sql` OR `)})`;
}

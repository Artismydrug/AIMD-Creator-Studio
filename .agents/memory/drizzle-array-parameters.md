---
name: Drizzle SQL array parameters
description: How to bind text arrays in raw Drizzle SQL fragments for PostgreSQL.
---

When a raw Drizzle SQL fragment needs a PostgreSQL array, build a typed
`ARRAY[...]` expression with `sql.join`; interpolating a JavaScript array and
casting it produces a row expression such as `($1, $2)::text[]`, which
PostgreSQL rejects.

**Why:** Drizzle expands interpolated JavaScript arrays into comma-separated
parameters, not a PostgreSQL array literal.

**How to apply:** Use `sql\`ARRAY[${sql.join(values.map((value) => sql\`${value}\`), sql\`, \`)}]::text[]\`` for `ANY` and array-overlap predicates.
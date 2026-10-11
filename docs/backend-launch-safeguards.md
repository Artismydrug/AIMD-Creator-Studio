# Creator Studio backend launch safeguards

## Scope

These protections reduce outage and overload risk. They are not a certification
of a particular number of simultaneous users. Public read bursts against a small
development dataset do not simulate a sustained launch.

## Runtime behavior

- The application pool retains its ten-connection limit per process. Connection
  waits expire after five seconds, SQL execution after fifteen seconds, and the
  driver has a seventeen-second query deadline. Idle connection failures are
  logged rather than emitted without a listener.
- At most 100 application requests are admitted concurrently per process.
  Excess requests receive JSON `503` and `Retry-After: 1`.
- Buffered uploads and challenge proof processing share one heavy-work slot per
  process, separate from ordinary reads. This gate runs before the upload route
  buffers up to 100 MB. Excess heavy work receives a retryable busy response;
  this is not a membership or user quota.
- Upstream media failures and viewer disconnects are observed through a stream
  pipeline, which closes/cancels the associated streams.
- Database outages/timeouts return generic retryable JSON, without exposing SQL
  parameters. Unexpected failures return generic JSON `500`.
- SIGTERM/SIGINT stops admission, drains HTTP requests and closes database pools.
  A ten-second deadline terminates remaining work rather than hanging a rollout.

## Database and provider efficiency

- Dashboard summary uses one SQL round trip and counts distinct completed
  habits, so multiple practice sessions cannot make completion exceed 100%.
- Habit sessions and streak updates commit together under a per-habit lock;
  multiple sessions on one date count as one streak day. Proof validation stays
  outside the transaction so remote storage does not hold database locks.
- Activity feed joins habit names rather than making a query for each item.
- Feed like-state lookup is limited to the currently returned posts.
- Ten non-unique indexes cover habit ownership/history, feed ordering/ownership,
  likes, enrollments and active skill tracks. They are defined in the Drizzle
  schema and applied in development. Existing records are not deleted.
- Stripe sync clients reuse their pools while configuration is unchanged,
  refresh credentials on each operation, and drain old clients after credential
  rotation. Two operations may run concurrently; a four-connection pool leaves
  room for SDK advisory locks and their nested queries.
- API startup no longer provisions Stripe webhooks, migrates Stripe tables or
  runs a full backfill. Existing webhook signature verification is preserved.
  Initial provider setup and catalog repair remain explicit maintenance work
  following the Stripe integration instructions, not replica startup work.

## Production rollout

Production startup checks the declared application tables/columns read-only,
rather than performing application-schema DDL. Existing legacy membership tier
normalization is retained to preserve entitlements. Development bootstrap
helpers run only with `NODE_ENV=development`.

**Publish the updated backend through the normal Publish flow** to apply the
development schema/index diff to the managed production database. Do not add
production SQL scripts, overwrite production data, or run schema repairs on
every production start. Publishing the backend does not submit a new iOS binary
to Apple.

Budget database connections across all replicas: the steady per-process ceiling
is ten application plus four Stripe connections. Leave headroom for draining
clients during credential rotation, maintenance and other consumers. Check the
actual production connection quota, configured maximum replicas and instance
memory before raising any limits.

## Probes

- `/api/livez`: inexpensive process liveness, no database query.
- `/api/healthz` and `/api/readyz`: database readiness; return `503` on failure.
  Concurrent callers share one query; success and failure are cached briefly.
  Callers have a two-second deadline, without spawning new queries while the
  original is still outstanding.

## Verification coverage and limits

Latest development verification:

- Shared-library and API TypeScript checks passed.
- 127 targeted tests passed, including simultaneous private habit writes,
  account isolation, rollback on failure, and interrupted heavy work.
- The restarted API completed 200 public read requests at concurrency 20 with
  zero failures; p95 was 114 ms. Three probe routes and two public data routes
  were exercised. This was a brief, sparse-data check, not sustained capacity.
- The mobile sign-in preview rendered successfully.

Targeted tests cover request admission/recovery, readiness failure/recovery,
interrupted streams, provider reuse/rotation/draining, schema validation, and
private habit/dashboard concurrency. Database route fixtures are disposable and
cleaned up. Their identity is supplied by the test harness and storage metadata
is mocked; they do not certify the real Clerk sign-in or App Storage upload path.

Before a larger rollout, use a dedicated staging dataset and real signed-in
sessions, representative media sizes and sustained traffic. Measure error rate,
latency, database waiters, CPU and peak memory; check recovery after traffic
stops. Do not load-test production with existing user accounts or expose fake
public posts to real creators.

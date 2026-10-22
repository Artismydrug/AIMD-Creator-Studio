-- Read-only schema preflight. Bind $1 to the target namespace (normally public).
-- Run through a read-only connection/transaction. This file applies NO migration.
-- ready: expected definition exists; pending: additive object is absent;
-- conflict: an existing definition differs; STOP and investigate before Publish.
WITH
expected_tables(table_name) AS (
  VALUES ('creator_portfolio_categories'), ('message_send_receipts')
),
expected_columns(table_name, column_name, type_name, required, default_pattern) AS (
  VALUES
    ('creator_portfolio_categories', 'id', 'integer', true, 'nextval(%'),
    ('creator_portfolio_categories', 'user_id', 'integer', true, NULL),
    ('creator_portfolio_categories', 'name', 'text', true, NULL),
    ('creator_portfolio_categories', 'position', 'integer', true, '0'),
    ('creator_portfolio_categories', 'created_at', 'timestamp with time zone', true, 'now()'),
    ('message_send_receipts', 'sender_id', 'integer', true, NULL),
    ('message_send_receipts', 'client_request_id', 'uuid', true, NULL),
    ('message_send_receipts', 'fingerprint', 'text', true, NULL),
    ('message_send_receipts', 'message_id', 'integer', false, NULL),
    ('message_send_receipts', 'created_at', 'timestamp with time zone', true, 'now()'),
    ('studio_posts', 'portfolio_category_id', 'integer', false, NULL),
    ('tattoo_bookings', 'request_type', 'text', true, '''tattoo''::text'),
    ('users', 'portfolio_categories_configured', 'boolean', true, 'false')
),
tables AS (
  SELECT c.oid, c.relname::text AS table_name, c.relkind
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = $1
),
columns AS (
  SELECT t.oid, t.table_name, a.attname::text AS column_name,
    pg_catalog.format_type(a.atttypid, a.atttypmod) AS type_name,
    a.attnotnull AS required, pg_catalog.pg_get_expr(d.adbin, d.adrelid) AS default_expression
  FROM tables t
  JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = t.oid AND d.adnum = a.attnum
),
expected_primary_keys(table_name, column_names) AS (
  VALUES
    ('creator_portfolio_categories', ARRAY['id']),
    ('message_send_receipts', ARRAY['sender_id', 'client_request_id'])
),
primary_keys AS (
  SELECT t.table_name, ARRAY(
    SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, position)
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    ORDER BY k.position
  ) AS column_names
  FROM tables t JOIN pg_catalog.pg_constraint c ON c.conrelid = t.oid AND c.contype = 'p'
),
expected_foreign_keys(table_name, column_name, target_table, target_column, delete_action) AS (
  VALUES
    ('creator_portfolio_categories', 'user_id', 'users', 'id', 'c'),
    ('message_send_receipts', 'sender_id', 'users', 'id', 'c'),
    ('studio_posts', 'portfolio_category_id', 'creator_portfolio_categories', 'id', 'n')
),
foreign_keys AS (
  SELECT t.table_name, a.attname::text AS column_name,
    rt.relname::text AS target_table, rn.nspname::text AS target_schema,
    ra.attname::text AS target_column, c.confdeltype::text AS delete_action,
    c.confupdtype::text AS update_action, c.convalidated,
    cardinality(c.conkey) = 1 AND cardinality(c.confkey) = 1 AS single_column
  FROM tables t
  JOIN pg_catalog.pg_constraint c ON c.conrelid = t.oid AND c.contype = 'f'
  JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = c.conkey[1]
  JOIN pg_catalog.pg_class rt ON rt.oid = c.confrelid
  JOIN pg_catalog.pg_namespace rn ON rn.oid = rt.relnamespace
  JOIN pg_catalog.pg_attribute ra ON ra.attrelid = rt.oid AND ra.attnum = c.confkey[1]
),
expected_indexes(table_name, index_name, column_names) AS (
  VALUES
    ('creator_portfolio_categories', 'creator_portfolio_categories_user_position_idx', ARRAY['user_id', 'position', 'id']),
    ('studio_posts', 'studio_posts_portfolio_category_idx', ARRAY['portfolio_category_id'])
),
indexes AS (
  SELECT t.table_name, ic.relname::text AS index_name, i.indisvalid, i.indisunique,
    i.indpred IS NULL AND i.indexprs IS NULL AS plain, am.amname::text AS method,
    ARRAY(
      SELECT a.attname::text FROM unnest(i.indkey) WITH ORDINALITY AS k(attnum, position)
      JOIN pg_catalog.pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      ORDER BY k.position
    ) AS column_names
  FROM tables t JOIN pg_catalog.pg_index i ON i.indrelid = t.oid
  JOIN pg_catalog.pg_class ic ON ic.oid = i.indexrelid
  JOIN pg_catalog.pg_am am ON am.oid = ic.relam
),
results AS (
  SELECT 'table:' || e.table_name AS item,
    CASE WHEN t.oid IS NULL THEN 'pending' WHEN t.relkind = 'r' THEN 'ready' ELSE 'conflict' END AS status,
    'Regular table required' AS expectation
  FROM expected_tables e LEFT JOIN tables t USING (table_name)
  UNION ALL
  SELECT 'column:' || e.table_name || '.' || e.column_name,
    CASE WHEN a.column_name IS NULL THEN 'pending'
      WHEN a.type_name = e.type_name AND a.required = e.required
        AND ((e.default_pattern IS NULL AND a.default_expression IS NULL)
          OR a.default_expression LIKE e.default_pattern) THEN 'ready'
      ELSE 'conflict' END,
    e.type_name || CASE WHEN e.required THEN ' NOT NULL' ELSE ' nullable' END
      || '; default ' || coalesce(e.default_pattern, 'none')
  FROM expected_columns e LEFT JOIN columns a USING (table_name, column_name)
  UNION ALL
  SELECT 'primary-key:' || e.table_name,
    CASE WHEN a.table_name IS NULL THEN 'pending'
      WHEN a.column_names = e.column_names THEN 'ready' ELSE 'conflict' END,
    array_to_string(e.column_names, ', ')
  FROM expected_primary_keys e LEFT JOIN primary_keys a USING (table_name)
  UNION ALL
  SELECT 'foreign-key:' || e.table_name || '.' || e.column_name,
    CASE WHEN a.column_name IS NULL THEN 'pending'
      WHEN a.target_schema = $1 AND a.target_table = e.target_table AND a.target_column = e.target_column
        AND a.delete_action = e.delete_action AND a.update_action = 'a'
        AND a.convalidated AND a.single_column THEN 'ready' ELSE 'conflict' END,
    e.target_table || '.' || e.target_column || '; delete ' || CASE e.delete_action WHEN 'c' THEN 'CASCADE' ELSE 'SET NULL' END
  FROM expected_foreign_keys e LEFT JOIN foreign_keys a USING (table_name, column_name)
  UNION ALL
  SELECT 'index:' || e.index_name,
    CASE WHEN a.index_name IS NULL THEN 'pending'
      WHEN a.table_name = e.table_name AND a.column_names = e.column_names AND a.indisvalid
        AND NOT a.indisunique AND a.plain AND a.method = 'btree' THEN 'ready' ELSE 'conflict' END,
    'btree (' || array_to_string(e.column_names, ', ') || ')'
  FROM expected_indexes e LEFT JOIN indexes a USING (index_name)
)
SELECT item, status, expectation FROM results ORDER BY item, status;

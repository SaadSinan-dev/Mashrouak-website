import assert from "node:assert/strict";
import { createTestPlatform } from "./postgres-fixture";
import {
  createPostgresPool,
  PostgresDatabase,
  assertUtf8,
} from "../backend/src/database";
const fixture = await createTestPlatform();
const schema = (await fixture.pool.query("SELECT current_schema() AS name"))
  .rows[0].name;
const pool = createPostgresPool(
  fixture.pool.options.connectionString!,
  schema,
  { transactionPool: true },
);
try {
  await assertUtf8(pool);
  const db = new PostgresDatabase(pool);
  for (let i = 0; i < 5; i++) {
    const value = await db
      .prepare("SELECT current_schema() AS name")
      .first<{ name: string }>();
    assert.equal(value?.name, schema);
  }
  await assert.rejects(() =>
    db.atomic(async (transaction) => {
      await transaction
        .prepare(
          "INSERT INTO scheduled_jobs(name,last_completed_at) VALUES('rollback',now())",
        )
        .run();
      throw new Error("rollback");
    }),
  );
  assert.equal(
    (
      await db
        .prepare("SELECT count(*) AS n FROM scheduled_jobs")
        .first<{ n: number }>()
    )?.n,
    0,
  );
  console.log(
    "PASS: 7 transaction-pool mode assertions on real local PostgreSQL; awaited schema isolation and rollback. This is not a live Neon test.",
  );
} finally {
  await pool.end();
  await fixture.dispose();
}

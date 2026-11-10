import { describe, it, expect } from "vitest";
import { Client } from "pg";
import {
  postgresConnectionConfig,
  createPostgresPool,
  administrativeDatabaseUrl,
} from "../backend/src/database";
describe("Neon startup and TLS regression", () => {
  for (const mode of ["direct", "pooled"])
    it(mode + " sends no startup settings and verifies TLS", async () => {
      const host =
        mode === "pooled"
          ? "ep-test-pooler.eu-central-1.aws.neon.tech"
          : "ep-test.eu-central-1.aws.neon.tech";
      const config = postgresConnectionConfig(
        `postgresql://qa:test@${host}/test?sslmode=require&options=-c%20search_path%3Dpublic`,
      );
      expect(config.options).toBe("");
      const url = new URL(config.connectionString);
      expect(url.searchParams.has("options")).toBe(false);
      expect(url.searchParams.get("sslmode")).toBe("verify-full");
      const pool = createPostgresPool(config.connectionString);
      expect(Boolean(pool.options.options)).toBe(false);
      expect(pool.options.max).toBe(4);
      const client = new Client(pool.options);
      // Inspect the installed driver's actual startup message without connecting.
      const startup = (
        client as Client & {
          getStartupConf(): Record<string, unknown>;
        }
      ).getStartupConf();
      expect(startup).not.toHaveProperty("options");
      expect(startup).not.toHaveProperty("search_path");
      expect(client.ssl).toBeTruthy();
      expect(client.ssl).not.toHaveProperty("rejectUnauthorized", false);
      expect(client.ssl).not.toHaveProperty("checkServerIdentity");
      await pool.end();
    });
  it("rejects inherited PGOPTIONS before any connection is opened", () => {
    const previous = process.env.PGOPTIONS;
    try {
      process.env.PGOPTIONS = "-c search_path=public";
      expect(() =>
        postgresConnectionConfig("postgresql://qa:test@localhost/db"),
      ).toThrow("Remove PGOPTIONS");
    } finally {
      if (previous === undefined) delete process.env.PGOPTIONS;
      else process.env.PGOPTIONS = previous;
    }
  });
  it("does not accept insecure remote TLS", () => {
    for (const mode of ["disable", "no-verify", "verify-ca", "prefer"])
      expect(() =>
        postgresConnectionConfig(
          `postgresql://qa:test@example.com/db?sslmode=${mode}`,
        ),
      ).toThrow();
  });
  it("requires direct administrative connection when runtime is pooled", () => {
    expect(() =>
      administrativeDatabaseUrl({
        DATABASE_URL: "postgresql://qa:test@ep-test-pooler.neon.tech/db",
      }),
    ).toThrow("direct");
    expect(
      administrativeDatabaseUrl({
        DATABASE_URL: "postgresql://qa:test@ep-test-pooler.neon.tech/db",
        DIRECT_DATABASE_URL: "postgresql://qa:test@ep-test.neon.tech/db",
      }),
    ).toContain("@ep-test.neon.tech");
  });
});

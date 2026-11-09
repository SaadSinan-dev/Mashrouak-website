CREATE TABLE preview_snapshots (
 token_hash TEXT PRIMARY KEY,
 snapshot TEXT NOT NULL CHECK (jsonb_typeof(snapshot::jsonb)='array'),
 actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 expires_at BIGINT NOT NULL
);
CREATE INDEX preview_snapshots_expiry ON preview_snapshots(expires_at);

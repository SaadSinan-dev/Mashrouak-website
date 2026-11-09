-- Additive: preserve every historical row, object key, reference and timestamp.
-- NULL provider metadata identifies a historical asset awaiting migration.
ALTER TABLE media ADD COLUMN cloudinary_asset_id TEXT;
ALTER TABLE media ADD COLUMN cloudinary_public_id TEXT;
ALTER TABLE media ADD COLUMN cloudinary_resource_type TEXT CHECK(cloudinary_resource_type IS NULL OR cloudinary_resource_type='image');
ALTER TABLE media ADD COLUMN cloudinary_delivery_type TEXT CHECK(cloudinary_delivery_type IS NULL OR cloudinary_delivery_type='authenticated');
ALTER TABLE media ADD COLUMN cloudinary_version INTEGER;
ALTER TABLE media ADD COLUMN cloudinary_format TEXT;
ALTER TABLE media ADD COLUMN cloudinary_secure_url TEXT;
ALTER TABLE media ADD COLUMN width INTEGER;
ALTER TABLE media ADD COLUMN height INTEGER;
ALTER TABLE media ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE media ADD COLUMN updated_at TEXT;
CREATE UNIQUE INDEX media_cloudinary_asset ON media(cloudinary_asset_id);
CREATE UNIQUE INDEX media_cloudinary_public_id ON media(cloudinary_public_id);
-- Durable compensation for failed uploads, replacement and deletion. No secrets.
CREATE TABLE media_cleanup (public_id TEXT PRIMARY KEY, not_before INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);

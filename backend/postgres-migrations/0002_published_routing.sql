ALTER TABLE content ADD COLUMN published_slug TEXT;
ALTER TABLE content ADD COLUMN published_sort_order INTEGER;
UPDATE content SET published_slug=slug,published_sort_order=sort_order WHERE published IS NOT NULL;

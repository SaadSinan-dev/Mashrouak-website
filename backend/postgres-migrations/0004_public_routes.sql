-- A draft route change must not allow another publication to claim a live route.
CREATE UNIQUE INDEX content_published_route ON content(kind,published_slug)
 WHERE published IS NOT NULL AND status='published';

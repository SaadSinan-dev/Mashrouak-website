import type { Database } from "./database";
export const servicesCorrections: [string, string][] = [
  ["خدماتنا", "خدماتنا"],
  [
    "الشركات، المكاتب المهنية، مقدمو الخدمات، والمشاريع التي تحتاج إلى حضور رقمي واضح",
    "الشركات، والمكاتب المهنية، ومقدّمي الخدمات، والمشاريع التي تحتاج إلى حضور رقمي واضح",
  ],
  [
    "قد يحتاج مشروعك إلى موقع تعريفي ولوحة إدارة وتكامل مع خدمة خارجية نساعدك على تحديد ما يجب بناؤه الآن، وما يمكن إضافته في مرحلة لاحقة",
    "قد يحتاج مشروعك إلى موقع تعريفي ولوحة إدارة وتكامل مع خدمة خارجية. نساعدك على تحديد ما يجب بناؤه الآن، وما يمكن إضافته في مرحلة لاحقة",
  ],
  [
    "Your project may need a website, an admin dashboard, and an integration with an external service We help identify what to build now and what can be added later",
    "Your project may need a website, an admin dashboard, and an integration with an external service. We help identify what to build now and what can be added later",
  ],
  [
    "Structure your catalogue, present useful product details, and connect order management with your store content",
    "Structure your catalog, present useful product details, and connect order management with your store content",
  ],
  [
    "Brands and retailers looking to organize their catalogue and customer orders digitally",
    "Brands and retailers looking to organize their catalog and customer orders digitally",
  ],
  ["An operation log when needed", "An activity log when needed"],
  [
    "We develop a catalogue and management interface suited to your data and day-to-day updates",
    "We develop a catalog and management interface suited to your data and day-to-day updates",
  ],
];
export function correctServicesCopy(value: unknown): unknown {
  if (typeof value === "string")
    return (
      servicesCorrections.find(([before]) => before === value)?.[1] ?? value
    );
  if (Array.isArray(value)) return value.map(correctServicesCopy);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        correctServicesCopy(item),
      ]),
    );
  return value;
}
// Correct each snapshot independently. An unrelated draft is never promoted.
export async function auditServicesCopy(
  database: Database,
  actorId: string,
  channel = "mashrouak_publication",
) {
  return database.atomic(async (db) => {
    const rows = await db
      .prepare(
        "SELECT id,version,draft,published FROM content WHERE kind IN ('services','settings') ORDER BY id FOR UPDATE",
      )
      .all<{
        id: string;
        version: number;
        draft: string;
        published: string | null;
      }>();
    let changed = 0,
      publishedChanged = false;
    for (const row of rows.results) {
      const draft = JSON.stringify(correctServicesCopy(JSON.parse(row.draft)));
      const published =
        row.published === null
          ? null
          : JSON.stringify(correctServicesCopy(JSON.parse(row.published)));
      if (draft === row.draft && published === row.published) continue;
      await db
        .prepare(
          "INSERT INTO revisions(id,content_id,version,data,actor_id,created_at) VALUES(?,?,?,?,?,now())",
        )
        .bind(crypto.randomUUID(), row.id, row.version, row.draft, actorId)
        .run();
      await db
        .prepare(
          "UPDATE content SET draft=?,published=?,version=version+1,updated_at=now() WHERE id=? AND version=?",
        )
        .bind(draft, published, row.id, row.version)
        .run();
      await db
        .prepare(
          "INSERT INTO audit_logs(id,actor_id,action,target_id,detail,created_at) VALUES(?,?,'content.copy-correction',?,?,now())",
        )
        .bind(
          crypto.randomUUID(),
          actorId,
          row.id,
          "Services proofreading; draft and published snapshots corrected independently",
        )
        .run();
      changed++;
      publishedChanged ||= published !== row.published;
    }
    if (publishedChanged)
      await db
        .prepare(
          "WITH p AS (UPDATE publication_state SET revision=revision+1,updated_at=now() WHERE id=1 RETURNING revision) SELECT pg_notify(?,revision::text) FROM p",
        )
        .bind(channel)
        .run();
    return { changed, publishedChanged };
  });
}

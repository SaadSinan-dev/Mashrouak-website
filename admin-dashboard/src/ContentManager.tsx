import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Plus,
  Search,
} from "lucide-react";
import { useParams } from "react-router-dom";
import {
  contentSchemas,
  kinds,
  slugSchema,
  type ContentData,
  type ContentEntry,
  type ContentKind,
  type SettingsContent,
} from "../../shared/schema";
import { useLocale, type CopyKey } from "./locale-context";
import { api, errorKey } from "./api";
import { publishContent } from "../../src/lib/publication";
import { useResource } from "./useResource";
import { blank } from "./fields";
import { FieldEditor } from "./FieldEditor";
import {
  SkeletonRegion,
  SkeletonTable,
  SkeletonText,
} from "../../shared/ui/Skeleton";
import { BusyInline, ResourceError } from "../../shared/ui/ResourceError";

export function ContentManager({ fixedKind }: { fixedKind?: ContentKind }) {
  const { kind: routeKind } = useParams();
  const kind =
    fixedKind ??
    (kinds.includes(routeKind as ContentKind)
      ? (routeKind as ContentKind)
      : "pages");
  return <ContentList key={kind} kind={kind} />;
}
function ContentList({ kind }: { kind: ContentKind }) {
  const { t, language, ar } = useLocale();
  const { data, loading, error, retry, reload } = useResource<{
    entries: ContentEntry[];
  }>(`/admin/content?kind=${kind}`);
  const [selected, setSelected] = useState<ContentEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  if (loading)
    return (
      <SkeletonRegion label={t("loading")}>
        <div className="admin-page-heading">
          <div>
            <SkeletonText heading lines={1} />
            <SkeletonText lines={1} />
          </div>
        </div>
        <SkeletonTable />
      </SkeletonRegion>
    );
  if (error && !data)
    return <ResourceError language={language} onRetry={retry} />;
  if (selected || creating)
    return (
      <ContentEditor
        key={selected?.id ?? `new-${kind}`}
        kind={kind}
        initial={selected}
        onBack={() => {
          setSelected(null);
          setCreating(false);
          void reload();
        }}
        onChange={(entry) => {
          setCreating(false);
          setSelected(entry);
          void reload();
        }}
      />
    );
  const entries = (data?.entries ?? []).filter(
    (entry) =>
      JSON.stringify(entry.draft)
        .toLowerCase()
        .includes(search.toLowerCase()) || entry.slug.includes(search),
  );
  const title = (entry: ContentEntry) => {
    const d = entry.draft as unknown as Record<
      string,
      { ar: string; en: string }
    >;
    return (d.name ?? d.title ?? d.companyName)?.[language] || entry.slug;
  };
  return (
    <div className="content-enter">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{t("content")}</span>
          <h1>{t(kind)}</h1>
          <p>{t("draftIsolation")}</p>
        </div>
        <button
          className="admin-button"
          onClick={() => setCreating(true)}
          disabled={kind === "settings" && !!entries.length}
        >
          <Plus size={17} />
          {t("create")}
        </button>
      </div>
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            aria-label={t("search")}
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span>
          {entries.length} {t("items")}
        </span>
      </div>
      {!!error && (
        <p className="admin-notice" role="status">
          {t(errorKey(error))}
          <button onClick={retry}>{t("retry")}</button>
        </p>
      )}
      {entries.length === 0 ? (
        <div className="admin-empty">
          <FileText size={32} />
          <p>{t("empty")}</p>
          <button
            className="admin-button admin-button--secondary"
            onClick={() => setCreating(true)}
          >
            {t("create")}
          </button>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("name")}</th>
                <th>{t("status")}</th>
                <th>{t("order")}</th>
                <th>{t("lastUpdated")}</th>
                <th>{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <button
                      className="table-title"
                      onClick={() => setSelected(entry)}
                    >
                      {title(entry)}
                    </button>
                    <small dir="ltr">/{entry.slug}</small>
                  </td>
                  <td>
                    <span
                      className={`status-badge status-badge--${entry.status}`}
                    >
                      {t(entry.status)}
                    </span>
                    {entry.published &&
                      JSON.stringify(entry.draft) !==
                        JSON.stringify(entry.published) && (
                        <small>
                          {t("unsaved").replace(
                            ar ? "غير محفوظة" : "unsaved",
                            ar ? "غير منشورة" : "unpublished",
                          )}
                        </small>
                      )}
                  </td>
                  <td>{entry.sort_order}</td>
                  <td>
                    {new Intl.DateTimeFormat(language, {
                      dateStyle: "medium",
                    }).format(new Date(entry.updated_at))}
                  </td>
                  <td>
                    <button
                      className="admin-button admin-button--text"
                      onClick={() => setSelected(entry)}
                    >
                      {t("edit")}{" "}
                      {ar ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
type Revision = {
  id: string;
  version: number;
  created_at: string;
  actor_name: string;
};
function ContentEditor({
  kind,
  initial,
  onBack,
  onChange,
}: {
  kind: ContentKind;
  initial: ContentEntry | null;
  onBack: () => void;
  onChange: (entry: ContentEntry) => void;
}) {
  const { t, language, ar } = useLocale();
  const [entry, setEntry] = useState(initial);
  const [data, setData] = useState<ContentData>(initial?.draft ?? blank(kind));
  const [slug, setSlug] = useState(
    initial?.slug ?? (kind === "settings" ? "global" : ""),
  );
  const [order, setOrder] = useState(initial?.sort_order ?? 0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState<CopyKey>("general");
  const [textSearch, setTextSearch] = useState("");
  const [translationPage, setTranslationPage] = useState(0);
  const dirty =
    !entry ||
    JSON.stringify(data) !== JSON.stringify(entry.draft) ||
    slug !== entry.slug ||
    order !== entry.sort_order;
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    setError("");
    setNotice("");
    const parsed = contentSchemas[kind].safeParse(data);
    if (!parsed.success || !slugSchema.safeParse(slug).success) {
      setError(t("invalid"));
      return;
    }
    setBusy(true);
    try {
      const result = await api<{ entry: ContentEntry }>(
        `/admin/content${entry ? `/${entry.id}` : ""}`,
        {
          method: entry ? "PUT" : "POST",
          body: JSON.stringify({
            kind,
            slug,
            sort_order: order,
            version: entry?.version ?? 0,
            data: parsed.data,
          }),
        },
      );
      setEntry(result.entry);
      setData(result.entry.draft);
      setNotice(t("saved"));
      onChange(result.entry);
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };
  const action = async (
    type: "publish" | "draft" | "archived" | "delete" | "preview",
  ) => {
    if (!entry) return;
    if (type === "delete" && !window.confirm(t("deleteConfirm"))) return;
    if (type === "draft" && !window.confirm(t("unpublishConfirm"))) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (type === "delete") {
        await api(`/admin/content/${entry.id}?version=${entry.version}`, {
          method: "DELETE",
        });
        onBack();
        return;
      }
      if (type === "preview") {
        setPreview('');
        const result = await api<{ token: string }>(
          `/admin/content/${entry.id}/preview`,
          { method: "POST" },
        );
        const origin = (
          import.meta.env.VITE_PUBLIC_URL ?? "http://localhost:5173"
        ).replace(/\/$/, "");
        const path =
          kind === "projects"
            ? `/work/${slug}`
            : kind === "pages"
              ? slug === "home"
                ? "/"
                : [
                      "about",
                      "services",
                      "process",
                      "contact",
                      "work",
                      "results",
                    ].includes(slug)
                  ? `/${slug}`
                  : `/pages/${slug}`
              : kind === "results"
                ? "/results"
                : kind === "services"
                  ? "/services"
                  : "/";
        setPreview(`${origin}${path}?preview=${result.token}&preview_language=${language}`);
        return;
      }
      const result = type === "publish" ? await publishContent(entry) : await api<{ entry: ContentEntry }>(
        `/admin/content/${entry.id}/state`,
        {
          method: "POST",
          body: JSON.stringify(
            { status: type, version: entry.version },
          ),
        },
      );
      setEntry(result.entry);
      setData(result.entry.draft);
      onChange(result.entry);
      setNotice(
        t(
          type === "publish"
            ? "published"
            : type === "draft"
              ? "draft"
              : "archived",
        ),
      );
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };
  const history = async () => {
    if (!entry) return;
    setHistoryLoading(true);
    setError("");
    try {
      setRevisions(
        (
          await api<{ revisions: Revision[] }>(
            `/admin/content/${entry.id}/revisions`,
          )
        ).revisions,
      );
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setHistoryLoading(false);
    }
  };
  const restore = async (revision: Revision) => {
    if (!entry) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ entry: ContentEntry }>(
        `/admin/content/${entry.id}/restore`,
        {
          method: "POST",
          body: JSON.stringify({
            revisionId: revision.id,
            version: entry.version,
          }),
        },
      );
      setEntry(result.entry);
      setData(result.entry.draft);
      onChange(result.entry);
      setNotice(t("restored"));
      setRevisions(null);
    } catch (e) {
      setError(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };
  const settingsTabs: Record<string, string[]> = {
    general: [
      "companyName",
      "description",
      "footerText",
      "logoArLight",
      "logoArDark",
      "logoEnLight",
      "logoEnDark",
    ],
    contact: ["email", "whatsapp", "instagram"],
    navigation: ["navigation", "ctaLabel", "ctaUrl"],
    seo: ["seoTitle", "seoDescription"],
    appearance: ["defaultLanguage", "defaultTheme"],
    assistant: ["chatEnabled", "aiEnabled"],
    translations: ["translations"],
  };
  const fields = Object.entries(data).filter(
    ([key]) => kind !== "settings" || settingsTabs[tab]?.includes(key),
  );
  const settings = data as SettingsContent;
  const translationKeys =
    kind === "settings"
      ? Object.keys(settings.translations.ar).filter((key) =>
          `${key} ${settings.translations.ar[key]} ${settings.translations.en[key]}`
            .toLowerCase()
            .includes(textSearch.toLowerCase()),
        )
      : [];
  return (
    <div className="content-enter">
      <button
        className="back-link"
        onClick={() => {
          if (!dirty || window.confirm(t("unsaved"))) onBack();
        }}
      >
        {ar ? <ArrowRight size={16} /> : <ArrowLeft size={16} />} {t("back")}
      </button>
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{t(kind)}</span>
          <h1>{initial ? t("edit") : t("create")}</h1>
          <p>{t("draftIsolation")}</p>
        </div>
        {entry && (
          <span className={`status-badge status-badge--${entry.published && JSON.stringify(data) !== JSON.stringify(entry.published) ? "draft" : entry.status}`}>
            {entry.published && JSON.stringify(data) !== JSON.stringify(entry.published) ? t("unpublishedChanges") : t(entry.status)}
          </span>
        )}
      </div>
      <form onSubmit={save}>
        <div className="editor-actions">
          <button className="admin-button" disabled={busy} type="submit">
            {busy ? <BusyInline label={t("saving")} /> : t("save")}
          </button>
          <button
            className="admin-button admin-button--secondary"
            type="button"
            disabled={busy || dirty}
            onClick={() => void action("preview")}
          >
            {t("preview")}
          </button>
          <button
            className="admin-button admin-button--secondary"
            type="button"
            disabled={busy || dirty}
            onClick={() => void action("publish")}
          >
            {t("publish")}
          </button>
          {dirty && <small>{t("savedFirst")}</small>}
        </div>
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="admin-notice" role="status">
            {notice}
          </p>
        )}
        {preview && (
          <a
            href={preview}
            target="_blank"
            rel="noreferrer"
            className="admin-notice preview-link"
          >
            {t("openPreview")}
            <ExternalLink size={16} />
          </a>
        )}
        <div className="editor-meta">
          <label>
            {t("slug")}
            <input
              dir="ltr"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              maxLength={100}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              readOnly={kind === "settings"}
            />
          </label>
          <label>
            {t("order")}
            <input
              type="number"
              required
              min={0}
              max={10000}
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
            />
          </label>
        </div>
        {kind === "results" && (
          <p className="admin-hint">{t("illustrativeNote")}</p>
        )}
        {kind === "pages" && <p className="admin-hint">{t("sectionNote")}</p>}
        {kind === "settings" && (
          <div
            className="editor-tabs"
            role="tablist"
            aria-label={t("settings")}
          >
            {Object.keys(settingsTabs).map((key) => (
              <button
                role="tab"
                type="button"
                key={key}
                aria-selected={tab === key}
                onClick={() => setTab(key as CopyKey)}
              >
                {t(key as CopyKey)}
              </button>
            ))}
          </div>
        )}
        <div className="editor-fields">
          {kind === "settings" && tab === "translations" ? (
            <>
              <label className="admin-search">
                <Search size={17} />
                <input
                  aria-label={t("filterText")}
                  placeholder={t("filterText")}
                  value={textSearch}
                  onChange={(e) => {
                    setTextSearch(e.target.value);
                    setTranslationPage(0);
                  }}
                />
              </label>
              {translationKeys
                .slice(translationPage * 20, (translationPage + 1) * 20)
                .map((key) => (
                  <fieldset className="editor-bilingual" key={key}>
                    <legend>
                      {(settings.translations[language][key] || key).slice(
                        0,
                        65,
                      )}
                    </legend>
                    {(["ar", "en"] as const).map((lang) => (
                      <label key={lang}>
                        <span>{t(lang)}</span>
                        <textarea
                          dir={lang === "ar" ? "rtl" : "ltr"}
                          rows={3}
                          maxLength={12000}
                          value={settings.translations[lang][key] ?? ""}
                          onChange={(e) =>
                            setData({
                              ...settings,
                              translations: {
                                ...settings.translations,
                                [lang]: {
                                  ...settings.translations[lang],
                                  [key]: e.target.value,
                                },
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </fieldset>
                ))}
              <div className="admin-pagination">
                <button
                  type="button"
                  disabled={translationPage === 0}
                  onClick={() => setTranslationPage((v) => v - 1)}
                >
                  {t("previous")}
                </button>
                <span>
                  {translationPage + 1} /{" "}
                  {Math.max(1, Math.ceil(translationKeys.length / 20))}
                </span>
                <button
                  type="button"
                  disabled={
                    (translationPage + 1) * 20 >= translationKeys.length
                  }
                  onClick={() => setTranslationPage((v) => v + 1)}
                >
                  {t("next")}
                </button>
              </div>
            </>
          ) : (
            fields.map(([key, value]) => (
              <FieldEditor
                key={key}
                field={key}
                value={value}
                onChange={(v) => setData({ ...data, [key]: v })}
              />
            ))
          )}
          {kind === "settings" && tab === "assistant" && (
            <p className="admin-hint">{t("noAi")}</p>
          )}
        </div>
      </form>
      {entry && (
        <div className="editor-lifecycle">
          <button
            className="admin-button admin-button--secondary"
            disabled={busy}
            onClick={() => void history()}
          >
            {t("revision")}
          </button>
          <button
            className="admin-button admin-button--text"
            disabled={busy}
            onClick={() => void action("draft")}
          >
            {t("unpublish")}
          </button>
          <button
            className="admin-button admin-button--text"
            disabled={busy}
            onClick={() => void action("archived")}
          >
            {t("archive")}
          </button>
          {kind !== "settings" && (
            <button
              className="admin-button admin-button--danger"
              disabled={busy || !!entry.published}
              onClick={() => void action("delete")}
            >
              {t("delete")}
            </button>
          )}
        </div>
      )}
      {historyLoading ? (
        <SkeletonRegion label={t("loading")}>
          <SkeletonTable rows={3} columns={3} />
        </SkeletonRegion>
      ) : (
        revisions && (
          <div className="revision-list">
            {revisions.length ? (
              revisions.map((r) => (
                <div key={r.id}>
                  <span>
                    {r.version} ·{" "}
                    {new Date(r.created_at).toLocaleString(language)} ·{" "}
                    {r.actor_name}
                  </span>
                  <button
                    className="admin-button admin-button--secondary"
                    disabled={busy}
                    onClick={() => void restore(r)}
                  >
                    {t("restore")}
                  </button>
                </div>
              ))
            ) : (
              <p>{t("noRevisions")}</p>
            )}
          </div>
        )
      )}
    </div>
  );
}

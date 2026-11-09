import { useRef, useState, type FormEvent } from "react";
import { Copy, ImagePlus, Upload } from "lucide-react";
import { api, errorKey, mediaUrl } from "./api";
import { useLocale } from "./locale-context";
import { useResource } from "./useResource";
import { MediaPreview, type MediaItem } from "./FieldEditor";
import { SkeletonMedia, SkeletonRegion } from "../../shared/ui/Skeleton";
import { BusyInline, ResourceError } from "../../shared/ui/ResourceError";
import { uploadMedia } from "./media-upload";

async function optimize(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp", "image/avif"].includes(
      file.type,
    ) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error("image");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("image");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("image"))),
      "image/webp",
      0.86,
    ),
  );
  if (blob.size > 5 * 1024 * 1024) throw new Error("image");
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, {
    type: "image/webp",
  });
}
export function MediaLibrary() {
  const { t, language } = useLocale();
  const { data, loading, error, retry, reload } = useResource<{
    media: MediaItem[];
    cleanup_pending: number;
  }>("/media");
  const [file, setFile] = useState<File | null>(null);
  const [altAr, setAltAr] = useState("");
  const [altEn, setAltEn] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [replacement, setReplacement] = useState<MediaItem | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const resetUpload = () => {
    setReplacement(null);
    setFile(null);
    setAltAr("");
    setAltEn("");
    setVisibility("public");
    formRef.current?.reset();
  };
  const upload = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setUploading(true);
    setNotice("");
    setActionError("");
    setProgress(null);
    try {
      const optimized = await optimize(file);
      const body = new FormData();
      body.set("file", optimized);
      body.set("alt_ar", altAr);
      body.set("alt_en", altEn);
      body.set("visibility", visibility);
      if (replacement) body.set("revision", String(replacement.revision));
      setProgress(0);
      const result = await uploadMedia(
        replacement ? `/media/${replacement.id}/replace` : "/media",
        body,
        setProgress,
      );
      resetUpload();
      setNotice(t(result.cleanup_pending ? "cleanupPending" : "mediaSaved"));
      await reload();
    } catch (err) {
      setActionError(
        t(
          err instanceof Error && err.message === "image"
            ? "imageError"
            : errorKey(err),
        ),
      );
    } finally {
      setBusy(false);
      setUploading(false);
    }
  };
  const remove = async (item: MediaItem) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    setActionError("");
    setBusy(true);
    try {
      const result = await api<{ cleanup_pending: boolean }>(
        `/media/${item.id}`,
        { method: "DELETE", signal: AbortSignal.timeout(65000) },
      );
      setNotice(t(result.cleanup_pending ? "cleanupPending" : "mediaSaved"));
      await reload();
    } catch (e) {
      setActionError(t(errorKey(e)));
    } finally {
      setBusy(false);
    }
  };
  const saveAlt = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setActionError("");
    try {
      await api(`/media/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          alt_ar: editing.alt_ar,
          alt_en: editing.alt_en,
          visibility: editing.visibility,
          revision: editing.revision,
        }),
      });
      setEditing(null);
      await reload();
      setNotice(t("mediaSaved"));
    } catch (err) {
      setActionError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="content-enter">
      <div className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">{t("content")}</span>
          <h1>{t("media")}</h1>
          <p>{t("replaceNote")}</p>
        </div>
        <ImagePlus size={32} strokeWidth={1.2} />
      </div>
      {replacement && (
        <p className="admin-notice" role="status">
          {t("replacingImage")}: {replacement.filename}
        </p>
      )}
      <form
        ref={formRef}
        className="media-upload-form"
        onSubmit={upload}
        aria-busy={busy}
      >
        <label>
          {t("file")}
          <input
            type="file"
            required
            disabled={busy}
            accept="image/png,image/jpeg,image/webp,image/avif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <label>
          {t("altAr")}
          <input
            required
            dir="rtl"
            disabled={busy}
            maxLength={500}
            value={altAr}
            onChange={(e) => setAltAr(e.target.value)}
          />
        </label>
        <label>
          {t("altEn")}
          <input
            required
            dir="ltr"
            disabled={busy}
            maxLength={500}
            value={altEn}
            onChange={(e) => setAltEn(e.target.value)}
          />
        </label>
        <label>
          {t("visibility")}
          <select
            disabled={busy || !!replacement}
            value={visibility}
            onChange={(e) =>
              setVisibility(e.target.value as "public" | "private")
            }
          >
            <option value="public">{t("public")}</option>
            <option value="private">{t("private")}</option>
          </select>
        </label>
        <p>{t("uploadNote")}</p>
        {uploading && (
          <div className="media-progress" role="status" aria-live="polite">
            <span>
              {t(
                progress === null
                  ? "optimizingImage"
                  : progress < 100
                    ? "sendingImage"
                    : "processingImage",
              )}
              {progress !== null && progress < 100 ? ` ${progress}%` : ""}
            </span>
            <progress
              aria-label={t("sendingImage")}
              max={100}
              value={progress ?? undefined}
            />
          </div>
        )}
        <button className="admin-button" disabled={busy || !file}>
          {busy ? (
            <BusyInline label={t("saving")} />
          ) : (
            <>
              <Upload size={16} />
              {t(
                actionError && file
                  ? "retry"
                  : replacement
                    ? "replaceImage"
                    : "upload",
              )}
            </>
          )}
        </button>
        {replacement && (
          <button
            className="admin-button admin-button--text"
            type="button"
            disabled={busy}
            onClick={resetUpload}
          >
            {t("cancel")}
          </button>
        )}
      </form>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {actionError && (
        <p className="admin-error" role="alert">
          {actionError}
        </p>
      )}
      {editing && (
        <form className="media-upload-form" onSubmit={saveAlt}>
          <label>
            {t("altAr")}
            <input
              required
              dir="rtl"
              maxLength={500}
              disabled={busy}
              value={editing.alt_ar}
              onChange={(e) =>
                setEditing({ ...editing, alt_ar: e.target.value })
              }
            />
          </label>
          <label>
            {t("altEn")}
            <input
              required
              dir="ltr"
              maxLength={500}
              disabled={busy}
              value={editing.alt_en}
              onChange={(e) =>
                setEditing({ ...editing, alt_en: e.target.value })
              }
            />
          </label>
          <label>
            {t("visibility")}
            <select
              value={editing.visibility}
              disabled={busy}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  visibility: e.target.value as "public" | "private",
                })
              }
            >
              <option value="public">{t("public")}</option>
              <option value="private">{t("private")}</option>
            </select>
          </label>
          <button className="admin-button" disabled={busy}>
            {t("saveMedia")}
          </button>
          <button
            className="admin-button admin-button--text"
            type="button"
            disabled={busy}
            onClick={() => setEditing(null)}
          >
            {t("cancel")}
          </button>
        </form>
      )}
      {!!data?.cleanup_pending && (
        <p className="admin-notice" role="status">
          {t("cleanupPending")}
        </p>
      )}
      {loading ? (
        <SkeletonRegion label={t("loading")}>
          <SkeletonMedia />
        </SkeletonRegion>
      ) : error && !data ? (
        <ResourceError language={language} onRetry={retry} />
      ) : data?.media.length ? (
        <div className="media-grid">
          {data.media.map((item) => (
            <article className="media-card" key={item.id}>
              <MediaPreview
                src={mediaUrl(`${item.url}?v=${item.revision}`)}
                alt={language === "ar" ? item.alt_ar : item.alt_en}
              />
              <div>
                <h2 dir="ltr">{item.filename}</h2>
                <p>{language === "ar" ? item.alt_ar : item.alt_en}</p>
                <small>
                  {t(item.visibility)} · {Math.ceil(item.size / 1024)} KB
                  {item.width && item.height
                    ? ` · ${item.width} × ${item.height}`
                    : ""}
                </small>
                {item.migration_required && (
                  <p className="admin-error">{t("mediaMigration")}</p>
                )}
                {item.usage.length > 0 && (
                  <p className="media-usage">
                    {t("usedBy")}: {item.usage.map((e) => e.slug).join(" · ")}
                  </p>
                )}
                <div className="media-card__actions">
                  <button
                    className="icon-button"
                    aria-label={t("copy")}
                    disabled={busy}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(item.url)
                        .then(() => setNotice(t("copied")))
                        .catch(() => setNotice(item.url))
                    }
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    className="admin-button admin-button--text"
                    disabled={busy}
                    onClick={() => {
                      setEditing(item);
                      setActionError("");
                      setNotice("");
                    }}
                  >
                    {t("edit")}
                  </button>
                  <button
                    className="admin-button admin-button--text"
                    disabled={busy || item.migration_required}
                    onClick={() => {
                      resetUpload();
                      setReplacement(item);
                      setAltAr(item.alt_ar);
                      setAltEn(item.alt_en);
                      setVisibility(item.visibility);
                      setActionError("");
                      setNotice("");
                      setEditing(null);
                      formRef.current?.scrollIntoView({ block: "center" });
                    }}
                  >
                    {t("replaceImage")}
                  </button>
                  <button
                    className="admin-button admin-button--text"
                    disabled={
                      busy || !!item.usage.length || item.migration_required
                    }
                    onClick={() => void remove(item)}
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          <ImagePlus size={32} />
          <p>{t("empty")}</p>
        </div>
      )}
    </div>
  );
}

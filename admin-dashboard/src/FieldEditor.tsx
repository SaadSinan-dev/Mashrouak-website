import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, X } from "lucide-react";
import { arrayItem, enumLabels, fieldLabels, options } from "./fields";
import { useLocale } from "./locale-context";
import { mediaUrl } from "./api";
import { useResource } from "./useResource";
import {
  SkeletonImage,
  SkeletonMedia,
  SkeletonRegion,
} from "../../shared/ui/Skeleton";
import { ResourceError } from "../../shared/ui/ResourceError";

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  type: string;
  size: number;
  alt_ar: string;
  alt_en: string;
  visibility: "public" | "private";
  usage: { id: string; slug: string }[];
  revision: number;
  migration_required?: boolean;
  width?: number | null;
  height?: number | null;
}
export function ImagePicker({
  value,
  onChange,
}: {
  value: { url: string; alt: { ar: string; en: string } } | null;
  onChange: (v: unknown) => void;
}) {
  const { t, language } = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <div className="image-picker">
      {value?.url && (
        <MediaPreview
          key={value.url}
          src={mediaUrl(value.url)}
          alt={value.alt[language]}
        />
      )}
      <div>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => setOpen((v) => !v)}
        >
          <ImagePlus size={16} />
          {t("selectImage")}
        </button>
        {value && (
          <button
            type="button"
            className="admin-button admin-button--text"
            onClick={() => onChange(null)}
          >
            {t("remove")}
          </button>
        )}
      </div>
      {value&&<FieldEditor field="alt" value={value.alt} onChange={alt=>onChange({...value,alt})}/>}
      {open && (
        <MediaChoices
          onSelect={(item) => {
            onChange({
              url: item.url,
              alt: { ar: item.alt_ar, en: item.alt_en },
            });
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
function MediaChoices({ onSelect }: { onSelect: (item: MediaItem) => void }) {
  const { t, language } = useLocale();
  const { data, error, loading, retry } = useResource<{ media: MediaItem[] }>(
    "/media",
  );
  if (loading)
    return (
      <SkeletonRegion label={t("loading")}>
        <SkeletonMedia />
      </SkeletonRegion>
    );
  if (error) return <ResourceError language={language} onRetry={retry} />;
  if (!data?.media.length)
    return (
      <p className="admin-hint">
        {t("empty")} · {t("media")}
      </p>
    );
  return (
    <div className="media-choices">
      <div className="media-choices__tools"><a href="/media" target="_blank" rel="noopener noreferrer">{t('upload')}</a><button type="button" onClick={retry}>{t('retry')}</button></div>
      {data.media.map((item) => (
        <div className="media-choice" key={item.id}>
          <MediaPreview
            src={mediaUrl(item.url)}
            alt={language === "ar" ? item.alt_ar : item.alt_en}
          />
          <button type="button" onClick={() => onSelect(item)}>
            <span>{item.filename}</span>
            <small>{t(item.visibility)}</small>
          </button>
        </div>
      ))}
    </div>
  );
}
function MediaPreview({ src, alt }: { src: string; alt: string }) {
  return <MediaPreviewImage key={src} src={src} alt={alt} />;
}
function MediaPreviewImage({ src, alt }: { src: string; alt: string }) {
  const { ar, t } = useLocale();
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (loaded || failed) return;
    const timeout = window.setTimeout(() => setFailed(true), 20000);
    return () => clearTimeout(timeout);
  }, [loaded, failed, src]);
  return (
    <div className="media-preview">
      {!loaded && !failed && (
        <span role="status" aria-label={t("loading")}>
          <SkeletonImage />
        </span>
      )}
      {failed ? (
        <div className="media-preview-error" role="status">
          <span>{ar ? "تعذّر تحميل الصورة" : "Image could not load"}</span>
          <button
            type="button"
            onClick={() => {
              setFailed(false);
              setLoaded(false);
              setRetry((value) => value + 1);
            }}
          >
            {t("retry")}
          </button>
        </div>
      ) : (
        <img
          key={`${src}:${retry}`}
          src={src}
          crossOrigin="use-credentials"
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
export { MediaPreview };
export function FieldEditor({
  field,
  value,
  onChange,
  depth = 0,
}: {
  field: string;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
}) {
  const { ar, t } = useLocale();
  const label =
    fieldLabels[field]?.[ar ? 0 : 1] ?? (ar ? "المحتوى" : "Content");
  if (field === "cover" || field === "image")
    return (
      <div className="editor-field">
        <span className="editor-label">{label}</span>
        <ImagePicker
          value={
            value as { url: string; alt: { ar: string; en: string } } | null
          }
          onChange={onChange}
        />
      </div>
    );
  if (typeof value === "boolean")
    return (
      <label className="editor-toggle">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{label}</span>
      </label>
    );
  if (typeof value === "number")
    return (
      <label className="editor-field">
        <span>{label}</span>
        <input
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );
  if (typeof value === "string") {
    const choices = field === "kind" ? ["text", "image"] : options[field];
    if (choices)
      return (
        <label className="editor-field">
          <span>{label}</span>
          <select value={value} onChange={(e) => onChange(e.target.value)}>
            {choices.map((option) => (
              <option key={option} value={option}>
                {enumLabels[option]?.[ar ? 0 : 1] ?? option}
              </option>
            ))}
          </select>
        </label>
      );
    return (
      <label className="editor-field">
        <span>{label}</span>
        <input
          value={value}
          maxLength={
            ["url", "to", "externalUrl", "buttonUrl", "ctaUrl"].includes(field)
              ? 2048
              : field === "id"
                ? 80
                : 500
          }
          dir={
            [
              "url",
              "to",
              "externalUrl",
              "buttonUrl",
              "ctaUrl",
              "whatsapp",
              "email",
              "id",
              "projectSlug",
            ].includes(field)
              ? "ltr"
              : undefined
          }
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }
  if (Array.isArray(value))
    return (
      <fieldset className={`editor-array editor-array--${field}`}>
        <legend>{label}</legend>
        {value.map((item, index) => (
          <div
            className="editor-array__item"
            key={
              typeof item === "object" && item && "id" in item
                ? String(item.id)
                : index
            }
          >
            <div className="editor-array__bar">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("moveUp")}
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...value];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    onChange(next);
                  }}
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("moveDown")}
                  disabled={index === value.length - 1}
                  onClick={() => {
                    const next = [...value];
                    [next[index + 1], next[index]] = [
                      next[index],
                      next[index + 1],
                    ];
                    onChange(next);
                  }}
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={t("remove")}
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                >
                  <X size={15} />
                </button>
              </div>
            </div>
            <FieldEditor
              field={
                field === "technologies"
                  ? "body"
                  : field === "gallery"
                    ? "image"
                    : field
              }
              value={item}
              depth={depth + 1}
              onChange={(v) =>
                onChange(value.map((current, i) => (i === index ? v : current)))
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="admin-button admin-button--secondary"
          onClick={() => onChange([...value, arrayItem(field)])}
        >
          <Plus size={15} />
          {t("add")}
        </button>
      </fieldset>
    );
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.ar === "string" && typeof obj.en === "string")
      return (
        <fieldset className="editor-bilingual">
          <legend>{label}</legend>
          {(["ar", "en"] as const).map((lang) => (
            <label key={lang}>
              <span>{t(lang)}</span>
              {field === "body" ? (
                <RichTextInput
                  language={lang}
                  value={String(obj[lang])}
                  onChange={(value) => onChange({ ...obj, [lang]: value })}
                />
              ) : (
                <textarea
                  rows={
                    [
                      "body",
                      "overview",
                      "description",
                      "methodology",
                      "challenge",
                      "solution",
                      "designApproach",
                    ].includes(field)
                      ? 4
                      : 2
                  }
                  maxLength={12000}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  lang={lang}
                  value={String(obj[lang])}
                  onChange={(e) => onChange({ ...obj, [lang]: e.target.value })}
                />
              )}
            </label>
          ))}
        </fieldset>
      );
    return (
      <div className={`editor-object editor-object--${depth}`}>
        {typeof obj.kind === "string" &&
          "visible" in obj &&
          obj.kind !== "text" &&
          obj.kind !== "image" && (
            <p className="admin-hint">
              {ar
                ? "قسم مهيأ: يمكنك ترتيبه وإخفاءه وتغيير خلفيته. حرّر نصوصه من إعدادات الموقع ← نصوص الموقع."
                : "Built-in section: reorder, hide or change its background. Edit its copy in Website settings → Website copy."}
            </p>
          )}
        {Object.entries(obj)
          .filter(
            ([key]) =>
              !(
                typeof obj.kind === "string" &&
                "visible" in obj &&
                obj.kind !== "text" &&
                obj.kind !== "image"
              ) || ["visible", "background"].includes(key),
          )
          .map(([key, item]) => (
            <FieldEditor
              key={key}
              field={key}
              value={item}
              depth={depth + 1}
              onChange={(v) => onChange({ ...obj, [key]: v })}
            />
          ))}
      </div>
    );
  }
  return null;
}

function RichTextInput({
  language,
  value,
  onChange,
}: {
  language: "ar" | "en";
  value: string;
  onChange: (value: string) => void;
}) {
  const { ar } = useLocale();
  const input = useRef<HTMLTextAreaElement>(null);
  const insert = (before: string, after = "") => {
    const el = input.current;
    if (!el) return;
    const start = el.selectionStart,
      end = el.selectionEnd;
    onChange(
      value.slice(0, start) +
        before +
        value.slice(start, end) +
        after +
        value.slice(end),
    );
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, end + before.length);
    });
  };
  return (
    <div className="rich-text-editor">
      <div
        className="rich-text-toolbar"
        role="toolbar"
        aria-label={ar ? "تنسيق النص" : "Text formatting"}
      >
        <button
          type="button"
          onClick={() => insert("**", "**")}
          aria-label={ar ? "عريض" : "Bold"}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          onClick={() => insert("*", "*")}
          aria-label={ar ? "مائل" : "Italic"}
        >
          <i>I</i>
        </button>
        <button type="button" onClick={() => insert("\n\n## ")}>
          {ar ? "عنوان" : "Heading"}
        </button>
        <button type="button" onClick={() => insert("\n- ")}>
          {ar ? "قائمة" : "List"}
        </button>
        <button type="button" onClick={() => insert("[", "](https://)")}>
          {ar ? "رابط" : "Link"}
        </button>
      </div>
      <textarea
        ref={input}
        rows={6}
        maxLength={12000}
        value={value}
        dir={language === "ar" ? "rtl" : "ltr"}
        lang={language}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

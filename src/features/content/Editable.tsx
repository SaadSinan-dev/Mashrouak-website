import { useContext, type ReactNode } from "react";
import { usePlatform } from "../../app/providers/content-context";
import { useLocale } from "../../app/providers/preferences-context";
import type { TranslationKey } from "../../locales/messages";
import {
  humanLabel,
  type FieldPath,
  type FieldRef,
} from "../../../shared/visual";
import { VisualContext } from "./visual-context";
import type { SettingsContent } from "../../../shared/schema";
export function CmsValue({
  kind,
  slug,
  path,
  label,
  children,
  rich = false,
  image = false,
  entryId,
  fallback,
}: {
  kind?: string;
  slug?: string;
  entryId?: string;
  path: FieldPath;
  label?: string;
  children: ReactNode;
  rich?: boolean;
  image?: boolean;
  fallback?: { ar: string; en: string };
}) {
  const active = useContext(VisualContext),
    { content } = usePlatform();
  const entry = active
    ? content?.entries.find((entry) =>
        entryId
          ? entry.id === entryId
          : entry.kind === kind && entry.slug === slug,
      )
    : undefined;
  if (!active || !entry) return <>{children}</>;
  const ref: FieldRef = {
    entryId: entry.id,
    path,
    label: label ?? humanLabel(String(path.at(-1))),
    kind: image ? "image" : rich ? "rich" : "text",
    ...(fallback ? { fallback } : {}),
  };
  return (
    <span style={{ display: "contents" }} data-cms-ref={JSON.stringify(ref)}>
      {children}
    </span>
  );
}
export function CmsCopy({
  copyKey,
  ar,
  en,
  label,
}: {
  copyKey: string;
  ar: string;
  en: string;
  label?: string;
}) {
  const { language } = useLocale(),
    { content } = usePlatform();
  const settings = content?.entries.find(
    (entry) => entry.kind === "settings" && entry.slug === "global",
  )?.data as SettingsContent | undefined;
  return (
    <CmsValue
      kind="settings"
      slug="global"
      path={["translations", copyKey]}
      label={label ?? en.slice(0, 56)}
      fallback={{ ar, en }}
    >
      {settings?.translations[language][copyKey] ??
        (language === "ar" ? ar : en)}
    </CmsValue>
  );
}
export function CmsText({ k }: { k: TranslationKey }) {
  const { t } = useLocale();
  return (
    <CmsValue
      kind="settings"
      slug="global"
      path={["translations", k]}
      label={humanLabel(k)}
    >
      {t(k)}
    </CmsValue>
  );
}

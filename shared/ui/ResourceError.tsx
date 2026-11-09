export function ResourceError({
  language,
  onRetry,
  message,
}: {
  language: "ar" | "en";
  onRetry: () => void;
  message?: string;
}) {
  return (
    <div className="resource-error" role="alert">
      <p>
        {message ||
          (language === "ar"
            ? "تعذّر تحميل المحتوى. أعد المحاولة لاستعادة الاتصال."
            : "Content could not be loaded. Retry to reconnect.")}
      </p>
      <button type="button" onClick={onRetry}>
        {language === "ar" ? "إعادة المحاولة" : "Retry"}
      </button>
    </div>
  );
}
export function BusyInline({ label }: { label: string }) {
  return (
    <span className="busy-inline" role="status" aria-label={label}>
      <span className="skeleton" aria-hidden="true" />
      <span className="skeleton" aria-hidden="true" />
      <span className="skeleton" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

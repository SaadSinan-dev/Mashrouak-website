import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { SkeletonImage } from "../../../shared/ui/Skeleton";
import { useLocale } from "../../app/providers/preferences-context";

interface SmartImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src"
> {
  src: string;
  width: number;
  height: number;
  priority?: boolean;
  fallbackLabel?: string;
}

export function SmartImage({
  src,
  width,
  height,
  priority = false,
  fallbackLabel = "Image unavailable",
  className = "",
  alt = "",
  ...props
}: SmartImageProps) {
  const [loadedSrc, setLoaded] = useState("");
  const [failedSrc, setFailed] = useState("");
  const loaded = loadedSrc === src;
  const failed = failedSrc === src;
  const { isArabic } = useLocale();
  useEffect(() => {
    if (loaded || failed) return;
    const timeout = window.setTimeout(() => setFailed(src), 20000);
    return () => clearTimeout(timeout);
  }, [src, loaded, failed]);
  return (
    <span
      className={`smart-image ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {!loaded && !failed && (
        <span
          className="smart-image__skeleton"
          role="status"
          aria-label={isArabic ? "جارٍ تحميل الصورة" : "Loading image"}
        >
          <SkeletonImage ratio={`${width} / ${height}`} />
        </span>
      )}
      {failed ? (
        <span className="smart-image__fallback" role="status">
          <span>{isArabic ? "الصورة غير متاحة" : fallbackLabel}</span>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              setFailed("");
            }}
          >
            {isArabic ? "إعادة المحاولة" : "Retry"}
          </button>
        </span>
      ) : (
        <img
          {...props}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded(src)}
          onError={() => setFailed(src)}
          className={`smart-image__asset${loaded ? " is-loaded" : ""}`}
        />
      )}
    </span>
  );
}

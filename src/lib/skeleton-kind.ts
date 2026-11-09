import type { SkeletonPageKind } from "../../shared/ui/Skeleton";
export function skeletonKind(path: string): SkeletonPageKind {
  if(path==='/about')return 'about';
  return path === "/contact/chat"
    ? "chat"
    : path.startsWith("/work/")
      ? "case"
      : path === "/work"
        ? "portfolio"
        : path === "/services"
          ? "services"
          : path === "/contact"
            ? "contact"
            : path === "/results"
              ? "results"
              : path === "/process"
                ? "process"
                : path === "/terms" || path === "/privacy"
                  ? "legal"
                  : path === "/"
                    ? "home"
                    : "default";
}

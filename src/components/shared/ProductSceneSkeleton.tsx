import {
  Skeleton,
  SkeletonImage,
  SkeletonText,
} from "../../../shared/ui/Skeleton";
export function ProductSceneSkeleton() {
  return (
    <div className="hero-scene-skeleton" aria-hidden="true">
      <div className="hero-scene-skeleton__desktop">
        <Skeleton style={{ height: 8, width: "40%" }} />
        <SkeletonImage ratio="2" />
        <SkeletonText lines={2} />
      </div>
      <div className="hero-scene-skeleton__phone">
        <SkeletonImage ratio=".5" />
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import {
  useLocale,
  useTheme,
} from "../../../app/providers/preferences-context";
import type { SceneStatus } from "../../../lib/scene-lifecycle";
import { createProductScene } from "./product-scene-renderer";

export function ProductScene({
  onStatus,
}: {
  onStatus: (status: SceneStatus) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createProductScene> | null>(null);
  const { language } = useLocale();
  const { theme } = useTheme();
  const preferences = useRef({ language, theme });
  useEffect(() => {
    preferences.current = { language, theme };
    controller.current?.update(language, theme);
  }, [language, theme]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    // Acquire WebGL on the next paint. A cancelled mount (including Strict
    // Mode's effect probe) must never allocate a second context or fetch assets.
    const frame = requestAnimationFrame(() => {
      controller.current = createProductScene(element, preferences.current, onStatus);
    });
    return () => {
      cancelAnimationFrame(frame);
      controller.current?.dispose();
      controller.current = null;
    };
  }, [onStatus]);
  return <div className="product-scene" ref={host} aria-hidden="true" />;
}

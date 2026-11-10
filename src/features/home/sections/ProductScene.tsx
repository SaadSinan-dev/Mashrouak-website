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
    if (!host.current) return;
    const scene = createProductScene(
      host.current,
      preferences.current,
      onStatus,
    );
    controller.current = scene;
    return () => {
      controller.current = null;
      scene.dispose();
    };
  }, [onStatus]);
  return <div className="product-scene" ref={host} aria-hidden="true" />;
}

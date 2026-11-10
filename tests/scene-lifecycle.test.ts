import { describe, expect, it } from "vitest";
import {
  SceneResources,
  advanceSceneReveal,
  revealHeight,
} from "../src/lib/scene-lifecycle";

describe("3D scene lifecycle", () => {
  it("releases partially acquired resources in reverse order exactly once", () => {
    const calls: string[] = [];
    const scope = new SceneResources();
    scope.add(() => calls.push("renderer"));
    const releaseTemporary = scope.add(() =>
      calls.push("environment compiler"),
    );
    releaseTemporary();
    scope.own({ dispose: () => calls.push("geometry") });
    scope.add(() => {
      calls.push("lost context");
      throw new Error("already lost");
    });
    scope.dispose();
    scope.dispose();
    expect(calls).toEqual([
      "environment compiler",
      "lost context",
      "geometry",
      "renderer",
    ]);
    scope.add(() => calls.push("late resource"));
    expect(calls.at(-1)).toBe("late resource");
  });

  it("reveals existing geometry in a repeatable, monotonic spatial order", () => {
    const run = () => {
      let progress = 0;
      const values: number[] = [];
      for (let frame = 0; frame < 60; frame++) {
        progress = advanceSceneReveal(progress, 1 / 60);
        values.push(revealHeight(progress, -2.3, 1.9));
      }
      expect(progress).toBe(1);
      expect(values.every((v, i) => v >= (values[i - 1] ?? -2.3))).toBe(true);
      expect(values.at(-1)).toBeCloseTo(1.9);
      expect(advanceSceneReveal(progress, -1)).toBe(1);
      return values;
    };
    expect(run()).toEqual(run());
  });
});

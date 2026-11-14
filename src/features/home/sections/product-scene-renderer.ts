import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  SceneResources,
  advanceSceneReveal,
  revealHeight,
  loadSceneImage,
  type SceneStatus,
} from "../../../lib/scene-lifecycle";
type Theme = "light" | "dark";
type Language = "ar" | "en";
// Original supplied logo images are contained at their native aspect ratio.
function screenTexture(
  image: HTMLImageElement,
  mobile: boolean,
  dark: boolean,
) {
  const canvas = document.createElement("canvas");
  canvas.width = mobile ? 723 : 1356;
  canvas.height = mobile ? 1584 : 783;
  const ctx = canvas.getContext("2d")!;
  const w = canvas.width,
    h = canvas.height;
  ctx.fillStyle = dark ? "#102733" : "#f6f4ee";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = dark ? "#29434c" : "#dce5df";
  ctx.lineWidth = 2;
  const round = (
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
  ) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  };
  const mint = dark ? "#8fc6bc" : "#0b625d",
    line = dark ? "#304c54" : "#d7e2dc";
  if (!mobile) {
    round(50, 38, 26, 8, 4, mint);
    round(92, 38, 26, 8, 4, line);
    round(134, 38, 26, 8, 4, line);
    ctx.beginPath();
    ctx.moveTo(48, 80);
    ctx.lineTo(w - 48, 80);
    ctx.stroke();
  }
  const maxWidth = w * (mobile ? 0.76 : 0.64),
    maxHeight = h * 0.2,
    scale = Math.min(
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight,
    );
  const logoWidth = image.naturalWidth * scale,
    logoHeight = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    (w - logoWidth) / 2,
    h * (mobile ? 0.28 : 0.23),
    logoWidth,
    logoHeight,
  );
  const start = h * (mobile ? 0.48 : 0.53);
  round(w * 0.15, start, w * 0.7, 8, 4, line);
  round(w * 0.23, start + 26, w * 0.54, 8, 4, line);
  round(
    w * (mobile ? 0.26 : 0.37),
    start + 65,
    w * (mobile ? 0.48 : 0.26),
    mobile ? 65 : 47,
    10,
    mint,
  );
  const y = h * (mobile ? 0.68 : 0.79),
    gap = mobile ? 18 : 24,
    columns = mobile ? 1 : 3;
  for (let index = 0; index < 3; index++) {
    const width = (w * 0.8 - gap * (columns - 1)) / columns,
      x = w * 0.1 + (index % columns) * (width + gap),
      top = y + Math.floor(index / columns) * (mobile ? 100 : 0);
    round(x, top, width, mobile ? 78 : 105, 12, dark ? "#193943" : "#e7ede7");
    round(x + 20, top + 23, width * 0.45, 7, 3, mint);
    round(x + 20, top + 45, width * 0.7, 6, 3, line);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
function roundedPlane(width: number, height: number, radius: number) {
  const shape = new THREE.Shape(),
    x = -width / 2,
    y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ShapeGeometry(shape, 10),
    positions = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv");
  for (let i = 0; i < positions.count; i++)
    uv.setXY(
      i,
      (positions.getX(i) + width / 2) / width,
      (positions.getY(i) + height / 2) / height,
    );
  return geometry;
}
export function createProductScene(
  element: HTMLDivElement,
  initial: { language: Language; theme: Theme },
  onStatus: (status: SceneStatus) => void,
) {
  const preferences = { current: initial };
  const resources = new SceneResources();
  let status: SceneStatus = { phase: "loading" };
  let frameId = 0;
  let assetRequest: AbortController | undefined;
  let updatePreferences = (_language: Language, _theme: Theme) => {};
  let inspect = () => ({
    meshes: 0,
    geometries: 0,
    materials: 0,
    textures: 0,
    calls: 0,
    triangles: 0,
    frames: 0,
    progress: 0,
    camera: [] as number[],
    position: [] as number[],
    screenSurfaces: 0,
    glassSurfaces: 0,
  });
  const notify = (next: SceneStatus) => {
    if (resources.disposed) return;
    status = next;
    onStatus(next);
  };
  const dispose = () => resources.dispose();
  const fail = (reason: string) => {
    if (resources.disposed) return;
    try {
      notify({ phase: "error", reason });
    } finally {
      dispose();
    }
  };
  const preparationDeadline = window.setTimeout(
    () => fail("preparation_timeout"),
    20000,
  );
  const clearPreparationDeadline = resources.add(() =>
    clearTimeout(preparationDeadline),
  );
  const canvas = document.createElement("canvas");
  resources.add(() => canvas.remove());
  resources.add(() => cancelAnimationFrame(frameId));
  resources.add(() => assetRequest?.abort());
  try {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    if (!gl) {
      throw new Error("webgl_unavailable");
    }
    resources.add(() => gl.getExtension("WEBGL_lose_context")?.loseContext());
    const engine = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    resources.add(() => {
      engine.dispose();
    });
    engine.debug.onShaderError = () => {
      throw new Error("shader_compile_failed");
    };
    engine.localClippingEnabled = true;
    engine.setClearColor(0x000000, 0);
    engine.outputColorSpace = THREE.SRGBColorSpace;
    engine.toneMapping = THREE.ACESFilmicToneMapping;
    engine.toneMappingExposure = 1.05;
    engine.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 640 ? 1 : 1.5),
    );
    engine.shadowMap.enabled = false;
    element.appendChild(canvas);
    canvas.dataset.background = "transparent";
    canvas.dataset.devices = "monitor smartphone";
    const scene = new THREE.Scene();
    scene.background = null;
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60),
      rig = new THREE.Group();
    scene.add(rig);
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>(),
      textures = new Set<THREE.Texture>();
    resources.add(() => textures.forEach((texture) => texture.dispose()));
    const ownGeometry = <T extends THREE.BufferGeometry>(geometry: T) => {
      geometries.add(geometry);
      return resources.own(geometry);
    };
    // A shared moving plane reveals the original surfaces without another mesh layer.
    const revealPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), -2.3);
    const own = <T extends THREE.Material>(material: T) => {
      material.clippingPlanes = [revealPlane];
      materials.add(material);
      return resources.own(material);
    };
    const metal = own(
      new THREE.MeshStandardMaterial({
        color: 0xa6b6b9,
        metalness: 0.92,
        roughness: 0.24,
      }),
    );
    const frame = own(
      new THREE.MeshStandardMaterial({
        color: 0x25363b,
        metalness: 0.78,
        roughness: 0.24,
      }),
    );
    const black = own(
      new THREE.MeshStandardMaterial({
        color: 0x070d11,
        metalness: 0.28,
        roughness: 0.23,
      }),
    );
    const glass = own(
      new THREE.MeshPhysicalMaterial({
        color: 0xe1f5f4,
        metalness: 0.08,
        roughness: 0.13,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        transparent: true,
        opacity: 0.045,
        depthWrite: false,
      }),
    );
    const lens = own(
      new THREE.MeshPhysicalMaterial({
        color: 0x142c40,
        metalness: 0.8,
        roughness: 0.08,
        clearcoat: 1,
      }),
    );
    const boxGeometries = new Map<string, THREE.BufferGeometry>();
    const box = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      d: number,
      material: THREE.Material,
      x = 0,
      y = 0,
      z = 0,
      r = 0.04,
    ) => {
      const radius = Math.min(r, w / 2, h / 2, d / 2);
      const key = [w, h, d, radius].join(":");
      let geometry = boxGeometries.get(key);
      if (!geometry) {
        geometry = ownGeometry(new RoundedBoxGeometry(w, h, d, 3, radius));
        boxGeometries.set(key, geometry);
      }
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };
    const monitor = new THREE.Group();
    monitor.position.set(0.48, 0.15, -0.15);
    monitor.rotation.y = 0.12;
    rig.add(monitor);
    box(monitor, 4.8, 2.94, 0.16, metal, 0, 0.35, 0, 0.075);
    box(monitor, 4.72, 2.86, 0.035, black, 0, 0.35, 0.094, 0.07);
    const screenPairs: {
      base: THREE.MeshBasicMaterial;
      darkMap: { value: THREE.Texture | null };
      mix: { value: number };
      mobile: boolean;
    }[] = [];
    const screen = (
      parent: THREE.Object3D,
      w: number,
      h: number,
      x: number,
      y: number,
      z: number,
      mobile: boolean,
      radius: number,
    ) => {
      const geometry = ownGeometry(roundedPlane(w, h, radius));
      const base = own(
        new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }),
      );
      const darkMap = { value: null as THREE.Texture | null };
      const mix = { value: preferences.current.theme === "dark" ? 1 : 0 };
      // Blend both themes on one screen surface instead of two near-coplanar meshes.
      base.onBeforeCompile = (shader) => {
        shader.uniforms.sceneDarkMap = darkMap;
        shader.uniforms.sceneThemeMix = mix;
        shader.fragmentShader = shader.fragmentShader
          .replace(
            "#include <common>",
            "#include <common>\nuniform sampler2D sceneDarkMap;\nuniform float sceneThemeMix;",
          )
          .replace(
            "#include <map_fragment>",
            "#ifdef USE_MAP\ndiffuseColor *= mix(texture2D(map, vMapUv), texture2D(sceneDarkMap, vMapUv), sceneThemeMix);\n#endif",
          );
      };
      base.customProgramCacheKey = () => "mashrouak-device-screen-v1";
      const face = new THREE.Mesh(geometry, base);
      face.name = "device-screen";
      face.position.set(x, y, z);
      parent.add(face);
      // The original optical glass is intentional, separate from the screen artwork.
      const cover = new THREE.Mesh(geometry, glass);
      cover.name = "device-glass";
      cover.position.set(x, y, z + 0.004);
      cover.renderOrder = 3;
      parent.add(cover);
      screenPairs.push({ base, darkMap, mix, mobile });
    };
    screen(monitor, 4.52, 2.61, 0, 0.42, 0.119, false, 0.035);
    box(monitor, 0.46, 0.065, 0.018, metal, 0, -1.038, 0.12, 0.02);
    box(monitor, 0.48, 0.95, 0.21, metal, 0, -1.51, -0.09, 0.065).rotation.x =
      -0.16;
    box(monitor, 1.9, 0.09, 1.05, metal, 0, -1.98, 0.03, 0.04);
    // Rear housing and ventilation are modeled, not painted into a photograph.
    box(monitor, 3.3, 1.8, 0.07, frame, 0, 0.4, -0.12, 0.03);
    for (let i = 0; i < 9; i++)
      box(
        monitor,
        0.22,
        0.025,
        0.018,
        black,
        -1.25 + i * 0.31,
        -0.38,
        -0.166,
        0.009,
      );
    const phone = new THREE.Group();
    phone.position.set(-1.72, -0.56, 1.05);
    phone.rotation.set(-0.035, -0.17, -0.075);
    rig.add(phone);
    box(phone, 1.35, 2.82, 0.18, metal, 0, 0, 0, 0.087);
    box(phone, 1.285, 2.755, 0.036, black, 0, 0, 0.102, 0.017);
    box(phone, 1.285, 2.755, 0.036, frame, 0, 0, -0.103, 0.017);
    screen(phone, 1.205, 2.64, 0, 0, 0.125, true, 0.135);
    box(phone, 0.355, 0.071, 0.008, black, 0, 1.166, 0.137, 0.004);
    const cameraGeometry = ownGeometry(
      new THREE.CylinderGeometry(0.026, 0.026, 0.008, 20),
    );
    const selfie = new THREE.Mesh(cameraGeometry, lens);
    selfie.rotation.x = Math.PI / 2;
    selfie.position.set(0.12, 1.166, 0.143);
    phone.add(selfie);
    box(phone, 0.3, 0.024, 0.008, metal, 0, -1.24, 0.14, 0.003);
    box(phone, 0.025, 0.34, 0.075, metal, 0.684, 0.37, 0, 0.01);
    box(phone, 0.025, 0.23, 0.075, metal, -0.684, 0.56, 0, 0.01);
    box(phone, 0.025, 0.23, 0.075, metal, -0.684, 0.24, 0, 0.01);
    box(phone, 0.58, 0.65, 0.07, frame, -0.27, 0.95, -0.148, 0.03);
    const barrelGeometry = ownGeometry(
      new THREE.CylinderGeometry(0.106, 0.106, 0.05, 24),
    );
    const opticGeometry = ownGeometry(new THREE.CircleGeometry(0.073, 24));
    for (const [x, y] of [
      [-0.4, 1.1],
      [-0.14, 1.1],
      [-0.4, 0.83],
    ]) {
      const barrel = new THREE.Mesh(barrelGeometry, metal);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(x!, y!, -0.205);
      phone.add(barrel);
      const optic = new THREE.Mesh(opticGeometry, lens);
      optic.rotation.y = Math.PI;
      optic.position.set(x!, y!, -0.232);
      phone.add(optic);
    }
    // Soft contact shadows have transparent edges and require no recurring shadow pass.
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const shadowContext = shadowCanvas.getContext("2d")!,
      gradient = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 63);
    gradient.addColorStop(0, "rgba(0,0,0,.65)");
    gradient.addColorStop(0.35, "rgba(0,0,0,.32)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    shadowContext.fillStyle = gradient;
    shadowContext.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    textures.add(shadowTexture);
    const shadow = own(
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    for (const [x, z, width, depth] of [
      [0.48, 0, 3.6, 2.1],
      [-1.72, 1.05, 1.8, 1.3],
    ]) {
      const geometry = ownGeometry(new THREE.PlaneGeometry(width!, depth!));
      const contact = new THREE.Mesh(geometry, shadow);
      contact.rotation.x = -Math.PI / 2;
      contact.position.set(x!, -2.04, z!);
      rig.add(contact);
    }

    const ambient = new THREE.HemisphereLight(0xf6f4ee, 0x29545b, 2.2);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xffffff, 3.5);
    key.position.set(-3, 6, 7);
    key.castShadow = false;
    key.shadow.mapSize.set(
      innerWidth < 640 ? 512 : 1024,
      innerWidth < 640 ? 512 : 1024,
    );
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.normalBias = 0.03;
    key.shadow.bias = -0.0004;
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x8fc6bc, 2.6);
    rim.position.set(4, 3, -4);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xd5e6ff, 1.1);
    fill.position.set(3, 1, 5);
    scene.add(fill);
    const room = new RoomEnvironment();
    const releaseRoom = resources.add(() => room.dispose());
    const pmrem = new THREE.PMREMGenerator(engine);
    const releasePMREM = resources.add(() => pmrem.dispose());
    const environment = resources.own(pmrem.fromScene(room, 0.04));
    resources.add(() => key.shadow.dispose());
    scene.environment = environment.texture;
    releaseRoom();
    releasePMREM();
    // Frame against immutable complete-model bounds, including during language changes.
    rig.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(rig);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    let visible = true,
      ready = false,
      assetsReady = false,
      last = performance.now(),
      intro = 0,
      progress = 0,
      renderedFrames = 0,
      blend = preferences.current.theme === "dark" ? 1 : 0,
      targetBlend = blend,
      targetX = 0,
      targetY = -0.14,
      currentX = 0,
      currentY = -0.14,
      loadedLanguage = "",
      loadVersion = 0;
    const lightMetal = new THREE.Color(0xa6b6b9),
      darkMetal = new THREE.Color(0x667e87),
      lightFrame = new THREE.Color(0x25363b),
      darkFrame = new THREE.Color(0x17333d),
      direction = new THREE.Vector3(0.26, 0.15, 1).normalize();
    const render = (time: number) => {
      frameId = 0;
      if (resources.disposed || !visible || document.hidden || !assetsReady)
        return;
      const dt = Math.min(0.06, Math.max(0.001, (time - last) / 1000));
      last = time;
      const damping = 1 - Math.exp(-8 * dt);
      // The reveal keeps position/orientation fixed. Preserve the original entrance
      // and pointer motion after the complete model has been successfully drawn.
      if (ready) intro = Math.min(1, intro + dt / 1.05);
      progress = advanceSceneReveal(progress, dt);
      revealPlane.constant = ready
        ? 100
        : revealHeight(progress, bounds.min.y - 0.24, bounds.max.y - 0.2);
      blend = THREE.MathUtils.lerp(blend, targetBlend, damping);
      if (Math.abs(blend - targetBlend) < 0.002) blend = targetBlend;
      if (ready) {
        currentX = THREE.MathUtils.lerp(currentX, targetX, damping);
        currentY = THREE.MathUtils.lerp(currentY, targetY, damping);
      }
      rig.rotation.set(currentX, currentY, 0);
      rig.position.y = -0.22 * Math.pow(1 - intro, 3);
      metal.color.copy(lightMetal).lerp(darkMetal, blend);
      frame.color.copy(lightFrame).lerp(darkFrame, blend);
      ambient.intensity = THREE.MathUtils.lerp(2.2, 1.35, blend);
      key.intensity = THREE.MathUtils.lerp(3.5, 2.5, blend);
      rim.intensity = THREE.MathUtils.lerp(2.6, 4.8, blend);
      fill.intensity = THREE.MathUtils.lerp(1.1, 2.1, blend);
      scene.environmentIntensity = THREE.MathUtils.lerp(0.8, 1.2, blend);
      shadow.opacity = THREE.MathUtils.lerp(0.42, 0.65, blend);
      for (const pair of screenPairs) pair.mix.value = blend;
      try {
        engine.render(scene, camera);
        renderedFrames++;
        canvas.dataset.reveal = progress.toFixed(3);
        if (status.phase === "loading") notify({ phase: "rendering" });
        if (!ready && progress === 1) {
          ready = true;
          notify({ phase: "ready" });
        }
      } catch {
        fail("render_failed");
        return;
      }
      const needsFrame =
        !ready ||
        intro < 1 ||
        Math.abs(blend - targetBlend) > 0.002 ||
        Math.abs(currentX - targetX) > 0.0003 ||
        Math.abs(currentY - targetY) > 0.0003;
      canvas.dataset.motion = needsFrame ? "active" : "idle";
      if (needsFrame) frameId = requestAnimationFrame(render);
    };
    const invalidate = () => {
      if (!frameId && !resources.disposed && visible && !document.hidden) {
        canvas.dataset.motion = "active";
        last = performance.now();
        frameId = requestAnimationFrame(render);
      }
    };
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      engine.setPixelRatio(
        Math.min(devicePixelRatio, innerWidth < 640 ? 1 : 1.5),
      );
      engine.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const vertical = THREE.MathUtils.degToRad(camera.fov),
        horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
      const distance =
        Math.max(
          size.y / (2 * Math.tan(vertical / 2)),
          size.x / (2 * Math.tan(horizontal / 2)),
        ) *
          1.17 +
        size.z * 0.45;
      camera.position.copy(center).addScaledVector(direction, distance);
      camera.lookAt(center);
      invalidate();
    };
    const update = async (language: Language, theme: Theme) => {
      if (resources.disposed) return;
      preferences.current = { language, theme };
      targetBlend = theme === "dark" ? 1 : 0;
      canvas.dataset.theme = theme;
      canvas.dataset.language = language;
      invalidate();
      if (loadedLanguage === language) return;
      loadedLanguage = language;
      const version = ++loadVersion;
      assetRequest?.abort();
      assetRequest = new AbortController();
      const signal = AbortSignal.any([
        assetRequest.signal,
        AbortSignal.timeout(12000),
      ]);
      try {
        const paths =
          theme === "dark" ? ["ivory", "colour"] : ["colour", "ivory"];
        const images = await Promise.all(
          paths.map((variant) =>
            loadSceneImage(
              `/brand/logo-horizontal${language === "en" ? "-en" : ""}-${variant}.${language === "en" ? "png" : "svg"}`,
              signal,
            ),
          ),
        );
        if (resources.disposed || version !== loadVersion) return;
        const byVariant = Object.fromEntries(
          paths.map((variant, index) => [variant, images[index]!]),
        ) as Record<string, HTMLImageElement>;
        const old = [...textures].filter(
          (texture) => texture !== shadowTexture,
        );
        const replacements = screenPairs.map((pair) => {
          const light = screenTexture(byVariant.colour!, pair.mobile, false);
          textures.add(light);
          const dark = screenTexture(byVariant.ivory!, pair.mobile, true);
          textures.add(dark);
          return { pair, light, dark };
        });
        for (const { pair, light, dark } of replacements) {
          pair.base.map = light;
          pair.darkMap.value = dark;
          pair.base.needsUpdate = true;
        }
        old.forEach((texture) => {
          textures.delete(texture);
          texture.dispose();
        });
        // Reveal these same surfaces on their first successful frame.
        if (!assetsReady) await engine.compileAsync(scene, camera);
        if (resources.disposed || version !== loadVersion) return;
        assetsReady = true;
        clearPreparationDeadline();
        canvas.dataset.logoAsset = `logo-horizontal${language === "en" ? "-en" : ""}`;
        resize();
        invalidate();
      } catch {
        if (!resources.disposed && version === loadVersion)
          fail("asset_load_failed");
      }
    };
    updatePreferences = (language, theme) => {
      void update(language, theme);
    };
    inspect = () => {
      let meshes = 0;
      let screenSurfaces = 0;
      let glassSurfaces = 0;
      rig.traverse((object) => {
        if ((object as THREE.Mesh).isMesh) meshes++;
        if (object.name === "device-screen") screenSurfaces++;
        if (object.name === "device-glass") glassSurfaces++;
      });
      return {
        meshes,
        geometries: geometries.size,
        materials: materials.size,
        textures: textures.size,
        calls: engine.info.render.calls,
        triangles: engine.info.render.triangles,
        frames: renderedFrames,
        progress,
        camera: camera.position.toArray(),
        position: rig.position.toArray(),
        screenSurfaces,
        glassSurfaces,
      };
    };
    const observer = new ResizeObserver(resize);
    resources.add(() => observer.disconnect());
    observer.observe(element);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) invalidate();
      else {
        cancelAnimationFrame(frameId);
        frameId = 0;
      }
    });
    resources.add(() => intersection.disconnect());
    intersection.observe(element);
    const pointer = (event: PointerEvent) => {
      const box = element.getBoundingClientRect();
      targetY = -0.14 + ((event.clientX - box.left) / box.width - 0.5) * 0.18;
      targetX = ((event.clientY - box.top) / box.height - 0.5) * 0.065;
      invalidate();
    };
    const leave = () => {
      targetX = 0;
      targetY = -0.14;
      invalidate();
    };
    const visibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frameId);
        frameId = 0;
      } else invalidate();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      fail("context_lost");
    };
    element.addEventListener("pointermove", pointer);
    resources.add(() => element.removeEventListener("pointermove", pointer));
    element.addEventListener("pointerleave", leave);
    resources.add(() => element.removeEventListener("pointerleave", leave));
    document.addEventListener("visibilitychange", visibility);
    resources.add(() =>
      document.removeEventListener("visibilitychange", visibility),
    );
    canvas.addEventListener("webglcontextlost", lost);
    resources.add(() => canvas.removeEventListener("webglcontextlost", lost));
    resize();
    void update(preferences.current.language, preferences.current.theme);
  } catch (error) {
    fail(error instanceof Error ? error.message : "initialization_failed");
  }
  return {
    update: updatePreferences,
    dispose,
    inspect: () => ({
      ...inspect(),
      status,
      disposed: resources.disposed,
      pendingFrame: !resources.disposed && frameId !== 0,
    }),
  };
}

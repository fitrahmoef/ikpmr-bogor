// Hero scene: the Riau traditional hall, v2 front reconstruction (createRiauBalaiModel from rumah-adat-pekanbaru):
// five stacked centre roof tiers and two gabled side wings, front facing +Z.
//
// One timeline, driven by the pinned hero's scroll progress (0..1):
//   0.00  front-right view, assembled, headline on the left
//   0.35  camera swings left and up, the hall comes apart in layers, HUD labels name the parts
//   0.60  still apart, camera keeps orbiting
//   0.80  the parts come back together
//   1.00  camera settles back on the whole front, handing over to the next section
// Before the timeline, a one-time entrance assembles the hall as the opening lifts.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createRiauBalaiModel, type RiauBuildingRuntime } from './createRiauBuildingModel';

type Theme = 'dark' | 'light';
export type HudLabel = { key: string; x: number; y: number; visible: number };
export type HallApi = { dispose: () => void; setProgress: (p: number) => void; setStageTop: (px: number | null) => void };

// parts mostly lift upward: sideways travel is damped so the layers read as one stack
function setExplode(root: THREE.Object3D, t: number) {
  const rt = root.userData.buildingRuntime as RiauBuildingRuntime;
  const parents = root.userData.componentParents as Record<string, string | null>;
  for (const [id, node] of Object.entries(rt.nodes)) {
    if (id === 'building') continue;
    const dir = node.userData.explodeDir as THREE.Vector3 | undefined;
    if (!dir) continue;
    const parentId = parents[id];
    const parentDir = parentId && parentId !== 'building' ? (rt.nodes[parentId].userData.explodeDir as THREE.Vector3 | undefined) : undefined;
    const d = parentDir ? dir.clone().sub(parentDir) : dir;
    node.position.set(d.x * t * 0.22, d.y * t, d.z * t * 0.5);
  }
}

const ease = (t: number) => 1 - Math.pow(1 - t, 4);
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

// camera keyframes (azimuth/elevation in degrees, distance as a factor of the fitted distance)
type Key = { p: number; az: number; el: number; d: number; ex: number };
const KEYS: Key[] = [
  { p: 0.0, az: 26, el: 10, d: 1.0, ex: 0 },
  { p: 0.35, az: -16, el: 17, d: 1.06, ex: 2.2 },
  { p: 0.6, az: -40, el: 22, d: 1.1, ex: 2.2 },
  { p: 0.8, az: -12, el: 12, d: 1.12, ex: 0 },
  { p: 1.0, az: 0, el: 6, d: 1.3, ex: 0 },
];
function sample(p: number) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = smooth(clamp01((p - a.p) / (b.p - a.p)));
  const l = (x: number, y: number) => x + (y - x) * t;
  return { az: l(a.az, b.az), el: l(a.el, b.el), d: l(a.d, b.d), ex: l(a.ex, b.ex) };
}

// HUD anchors on named parts, in model space; they ride their component as it moves apart
const ANCHORS: { key: string; comp: string; pos: [number, number, number] }[] = [
  { key: 'selembayung', comp: 'selembayung', pos: [0, 44.6, 2.6] },
  { key: 'tingkat', comp: 'upper-gable-roof', pos: [0, 33.5, 5.4] },
  { key: 'lebah', comp: 'scalloped-valance', pos: [-11, 17.7, 13.2] },
  { key: 'portico', comp: 'portico-roof', pos: [0, 14.6, 14.6] },
  { key: 'sayap', comp: 'wing-roof', pos: [20.5, 20.5, 9.8] },
];

export function mountHall(container: HTMLElement, opts: {
  theme: Theme; reducedMotion: boolean; startSignal: Promise<void>;
  onLoad?: (stage: 'model' | 'frame') => void;
  onLabels?: (labels: HudLabel[]) => void;
}): HallApi | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;

  const hemi = new THREE.HemisphereLight('#f3ead6', '#4a3d2e', 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe7c2', 2.7);
  sun.position.set(45, 70, 65);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 40, bottom: -40, near: 10, far: 220 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 4;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#e6ecf5', 0.5);
  fill.position.set(-60, 30, 20);
  scene.add(fill);

  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.4 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(140, 64), shadowMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  let needsRender = true;
  const applyTheme = (t: Theme) => {
    renderer.toneMappingExposure = t === 'light' ? 0.95 : 0.9;
    hemi.intensity = t === 'light' ? 0.95 : 0.8;
    shadowMat.opacity = t === 'light' ? 0.18 : 0.4;
    needsRender = true;
  };

  const model = createRiauBalaiModel({ includeSite: false });
  scene.add(model);
  opts.onLoad?.('model');
  const rt = model.userData.buildingRuntime as RiauBuildingRuntime;

  const box = new THREE.Box3().setFromObject(model);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const target = new THREE.Vector3(sphere.center.x, box.min.y + (box.max.y - box.min.y) * 0.42, sphere.center.z);

  const FOV = 24;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 800);
  const DIST = sphere.radius / Math.sin((FOV * Math.PI) / 360);
  const deg = Math.PI / 180;
  let fit = 1;
  const place = (az: number, el: number, d: number) => {
    const r = d * DIST * fit;
    camera.position.set(
      target.x + Math.sin(az * deg) * Math.cos(el * deg) * r,
      target.y + Math.sin(el * deg) * r,
      target.z + Math.cos(az * deg) * Math.cos(el * deg) * r,
    );
    camera.lookAt(target);
  };

  // entrance: parts start apart and come together as the opening lifts
  const INTRO = opts.reducedMotion ? 0 : 2600;
  const EXPLODE_FROM = 6;
  let intro: 'wait' | number | -1 = INTRO ? 'wait' : -1;
  let started = false;
  opts.startSignal.then(() => { started = true; });

  let targetP = 0, p = 0;
  let stageTop: number | null = null; // phones and tablets: where the stacked text ends, in canvas pixels
  let w = 0, h = 0, wide = false;
  const resize = () => {
    w = container.clientWidth; h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    wide = w >= 1024;
    // the distance is set by the vertical field of view; a canvas narrower than it is tall also has
    // to fit the hall's width, or the roof tips leave the screen on phones
    const half = (FOV * Math.PI) / 360;
    const widthFit = Math.sin(half) / Math.sin(Math.atan(Math.tan(half) * (w / h)));
    fit = wide ? 1 : Math.max(w / h > 1.1 ? 0.78 : 0.92, widthFit * 0.8);
    needsRender = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  applyTheme(opts.theme);

  const onTheme = (e: Event) => applyTheme((e as CustomEvent<Theme>).detail);
  window.addEventListener('ikpmr-theme', onTheme);

  const v = new THREE.Vector3();
  const off = new THREE.Vector3();
  const frame = (introEx: number | null) => {
    const k = sample(p);
    // phones and tablets: the hall starts a little smaller so it fits between the text and the footer
    const settle = stageTop === null ? 1 : smooth(clamp01((p - 0.06) / 0.18));
    place(k.az, k.el, k.d * (1 + 0.22 * (1 - settle)));
    // on wide screens the hall starts right of the headline and drifts to centre as the text erases
    if (wide) {
      const shift = -0.19 * (1 - smooth(clamp01((p - 0.14) / 0.24))); // drift to centre once the text is mostly erased
      camera.setViewOffset(w, h, w * shift, -h * 0.05 * (1 - p), w, h);
    } else if (stageTop !== null) {
      // the canvas fills the screen; the view starts lowered so the hall sits under the text, then
      // rises to the middle as the text erases (on short screens it starts half below the fold)
      // where the roof top (the selembayung) lands with no offset, so it can be kept under the buttons
      camera.clearViewOffset();
      camera.updateProjectionMatrix();
      v.set(target.x, box.max.y, target.z).project(camera);
      const roofTop = (-v.y * 0.5 + 0.5) * h;
      const centred = Math.max(stageTop + (h - stageTop - 56) / 2, stageTop + h * 0.16) - h / 2;
      const clearOfText = stageTop + 16 - roofTop;
      camera.setViewOffset(w, h, 0, -Math.max(centred, clearOfText) * (1 - settle), w, h);
    } else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    const ex = introEx ?? k.ex;
    setExplode(model, ex);

    if (opts.onLabels) {
      const vis = smooth(clamp01((ex - 1.2) / 1.0)) * (introEx === null ? 1 : 0);
      opts.onLabels(ANCHORS.map((a) => {
        rt.nodes[a.comp]?.getWorldPosition(off);
        v.set(a.pos[0], a.pos[1], a.pos[2]).add(off).project(camera);
        return { key: a.key, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 ? vis : 0 };
      }));
    }
  };

  let visible = true, raf = 0, first = true, lastT = 0;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(loop);
  });
  io.observe(container);

  function loop(now: number) {
    raf = 0;
    if (!visible) return;
    if (intro === 'wait' && started) intro = now;
    // scrolling into the timeline finishes the entrance at once
    if (targetP > 0.01 && intro !== -1) intro = -1;
    let introEx: number | null = null;
    if (typeof intro === 'number' && intro !== -1) {
      const t = Math.min((now - intro) / INTRO, 1);
      introEx = EXPLODE_FROM * (1 - ease(Math.min(t * 1.1, 1)));
      needsRender = true;
      if (t >= 1) intro = -1;
    } else if (intro === 'wait') {
      introEx = EXPLODE_FROM;
    }
    // inertia: progress eases toward the scroll position, time-based so slow devices never lag far behind
    const dt = lastT ? Math.min(0.1, (now - lastT) / 1000) : 0.016;
    lastT = now;
    const next = opts.reducedMotion ? targetP : p + (targetP - p) * (1 - Math.exp(-dt * 7));
    if (Math.abs(next - p) > 0.0004) { p = next; needsRender = true; } else if (p !== targetP) { p = targetP; needsRender = true; }
    if (needsRender) {
      frame(introEx);
      renderer.render(scene, camera);
      needsRender = false;
      if (first) { first = false; container.classList.add('is-ready'); opts.onLoad?.('frame'); }
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    setProgress: (n) => { targetP = clamp01(n); },
    setStageTop: (px) => { stageTop = px; needsRender = true; },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('ikpmr-theme', onTheme);
      pmrem.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) ([] as THREE.Material[]).concat(m.material).forEach((mat) => {
          const sm = mat as THREE.MeshStandardMaterial;
          for (const k of ['map', 'normalMap', 'bumpMap', 'roughnessMap'] as const) sm[k]?.dispose();
          mat.dispose();
        });
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

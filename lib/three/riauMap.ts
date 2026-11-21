// 3D map of Riau province: each of the 12 regencies is extruded from its real boundary
// (geoBoundaries, BPS) and rises to a height set by the number of members from there.
// One entrance: the regencies grow to their counts when the map scrolls into view.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import geo from '@/lib/riau-geo.json';
import { REGENCIES } from '@/lib/riau';

type Theme = 'dark' | 'light';
type Geo = { regencies: Record<string, { name: string; rings: number[][][] }> };
export type MapApi = { dispose: () => void; select: (key: string | null) => void };

const K = 7;                     // world units per degree
const C = { lng: 101.75, lat: 0.62 }; // province centre
const ease = (t: number) => 1 - Math.pow(1 - t, 4);
const toXZ = (lng: number, lat: number) => [(lng - C.lng) * K, (lat - C.lat) * K] as const;

const PALETTE = {
  dark: { land: '#253f2e', landTop: '#335a40', lead: '#d8b25c', edge: '#d8b25c', hemiSky: '#f3ead6', hemiGround: '#1a1510' },
  light: { land: '#c9d6c3', landTop: '#dfe7d8', lead: '#c9a14a', edge: '#8a6a24', hemiSky: '#ffffff', hemiGround: '#b8ad98' },
};

export function mountRiauMap(
  container: HTMLElement,
  opts: { counts: Record<string, number>; theme: Theme; reducedMotion: boolean; interactive?: boolean; onSelect?: (key: string | null) => void },
): MapApi | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  container.appendChild(renderer.domElement);

  // HTML labels: a figure per regency, positioned over the top of its prism
  const labelLayer = document.createElement('div');
  labelLayer.className = 'map3d-labels';
  container.appendChild(labelLayer);

  const scene = new THREE.Scene();
  const hemi = new THREE.HemisphereLight('#ffffff', '#000000', 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe7c2', 2.2);
  sun.position.set(-14, 30, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 80 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), shadowMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const max = Math.max(1, ...Object.values(opts.counts));
  const lead = Object.entries(opts.counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const heightOf = (n: number) => 0.25 + (n / max) * 3.2;

  type Region = {
    key: string; group: THREE.Group; mesh: THREE.Mesh; height: number;
    label: HTMLDivElement; anchor: THREE.Vector3; mat: THREE.MeshStandardMaterial; edgeMat: THREE.LineBasicMaterial;
  };
  const regions: Region[] = [];
  const data = geo as Geo;

  for (const r of REGENCIES) {
    const g = data.regencies[r.key];
    if (!g) continue;
    const n = opts.counts[r.key] ?? 0;
    const shapes = g.rings.map((ring) => {
      const s = new THREE.Shape();
      ring.forEach(([lng, lat], i) => {
        const [x, y] = toXZ(lng, lat);
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      });
      return s;
    });
    const h = heightOf(n);
    const geom = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 1 });
    geom.rotateX(-Math.PI / 2); // shape y (north) -> -z, extrusion -> +y
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.key = r.key;
    // outline only along the top of each prism, like a gold thread
    const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.7 });
    const group = new THREE.Group();
    group.add(mesh);
    for (const ring of g.rings) {
      const pts = ring.map(([lng, lat]) => { const [x, y] = toXZ(lng, lat); return new THREE.Vector3(x, 1.001, -y); });
      group.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), edgeMat));
    }
    group.scale.y = opts.reducedMotion ? h : 0.001;
    scene.add(group);

    const [ax, az] = toXZ(r.lng, r.lat);
    const label = document.createElement('div');
    label.className = `map3d-label ${r.key === lead ? 'lead' : ''} ${n ? '' : 'zero'}`;
    label.innerHTML = `<b>${n}</b><span>${g.name.replace('Kota ', '')}</span>`;
    labelLayer.appendChild(label);
    regions.push({ key: r.key, group, mesh, height: h, label, anchor: new THREE.Vector3(ax, 0, -az), mat, edgeMat });
  }

  const applyTheme = (t: Theme) => {
    const p = PALETTE[t];
    hemi.color.set(p.hemiSky);
    hemi.groundColor.set(p.hemiGround);
    shadowMat.opacity = t === 'light' ? 0.16 : 0.4;
    for (const r of regions) {
      r.mat.color.set(r.key === lead ? p.lead : (opts.counts[r.key] ?? 0) > 0 ? p.landTop : p.land);
      r.edgeMat.color.set(p.edge);
    }
    needsRender = true;
  };

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);
  const target = new THREE.Vector3(0, 0.6, 0);
  camera.position.set(4, 30, 30);
  camera.lookAt(target);

  let controls: OrbitControls | null = null;
  if (opts.interactive !== false) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.4;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.1;
    controls.minAzimuthAngle = -0.8;
    controls.maxAzimuthAngle = 0.8;
    if (window.matchMedia('(pointer: coarse)').matches) {
      controls.enabled = false;
      renderer.domElement.style.touchAction = 'pan-y';
    }
    controls.addEventListener('change', () => { needsRender = true; });
  }

  let needsRender = true;
  let w = 0, h = 0;
  const resize = () => {
    w = container.clientWidth; h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole province in frame on narrow screens
    camera.position.copy(target).add(new THREE.Vector3(w / h < 0.9 ? 0 : 3, 34, 30).setLength(w / h < 0.9 ? 74 : w / h < 1.2 ? 60 : 50));
    camera.lookAt(target);
    controls?.update();
    camera.updateProjectionMatrix();
    needsRender = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  applyTheme(opts.theme);

  // hover and select
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let hovered: string | null = null;
  let selected: string | null = null;
  const pick = (e: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(regions.map((r) => r.mesh))[0];
    return (hit?.object.userData.key as string) ?? null;
  };
  const onMove = (e: PointerEvent) => {
    const k = pick(e);
    if (k !== hovered) { hovered = k; renderer.domElement.style.cursor = k ? 'pointer' : ''; needsRender = true; }
  };
  let downAt = { x: 0, y: 0 };
  const onDown = (e: PointerEvent) => { downAt = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4) return; // a drag, not a click
    const k = pick(e);
    selected = k;
    opts.onSelect?.(k);
    needsRender = true;
  };
  renderer.domElement.addEventListener('pointermove', onMove);
  renderer.domElement.addEventListener('pointerdown', onDown);
  renderer.domElement.addEventListener('pointerup', onUp);

  const onTheme = (e: Event) => applyTheme((e as CustomEvent<Theme>).detail);
  window.addEventListener('ikpmr-theme', onTheme);

  // grow once when the map first enters the viewport
  let growStart: number | null = opts.reducedMotion ? -1 : null;
  let visible = false, raf = 0;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && growStart === null) growStart = performance.now();
    if (visible && !raf) raf = requestAnimationFrame(loop);
  }, { threshold: 0.25 });
  io.observe(container);

  const v = new THREE.Vector3();
  const lift = new Map<string, number>();
  function loop(now: number) {
    raf = 0;
    if (!visible) return;
    if (growStart !== null && growStart !== -1) {
      let done = true;
      regions.forEach((r, i) => {
        const p = Math.min(Math.max((now - growStart! - i * 60) / 1100, 0), 1);
        if (p < 1) done = false;
        r.group.scale.y = Math.max(0.001, r.height * ease(p));
      });
      needsRender = true;
      if (done) growStart = -1;
    }
    for (const r of regions) {
      const want = r.key === hovered || r.key === selected ? 0.25 : 0;
      const cur = lift.get(r.key) ?? 0;
      if (Math.abs(want - cur) > 0.002) {
        const next = cur + (want - cur) * 0.2;
        lift.set(r.key, next);
        r.group.position.y = next;
        needsRender = true;
      }
    }
    if (controls?.update()) needsRender = true;
    if (needsRender) {
      renderer.render(scene, camera);
      needsRender = false;
      // place labels over the top of each prism
      for (const r of regions) {
        v.copy(r.anchor);
        v.y = r.group.scale.y + r.group.position.y + 0.15;
        v.project(camera);
        const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
        r.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
        r.label.classList.toggle('active', r.key === hovered || r.key === selected);
      }
      container.classList.add('is-ready');
    }
    raf = requestAnimationFrame(loop);
  }

  return {
    select: (key) => { selected = key; needsRender = true; },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('ikpmr-theme', onTheme);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls?.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        if (m.material) ([] as THREE.Material[]).concat(m.material).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
      labelLayer.remove();
    },
  };
}

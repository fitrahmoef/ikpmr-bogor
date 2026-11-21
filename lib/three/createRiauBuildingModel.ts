/**
 * Procedural Three.js model of a Riau Malay traditional hall (Balai Adat, Pekanbaru), built entirely
 * in code from reference photos: component ids, layout in metres, materials and palettes.
 *
 * Approximate/stylized: single 3/4 reference view; rear + far-left facades are inferred.
 * Frame: +Y up, +Z = long facade (left in the photo), +X = entrance wing gable (right in photo).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type BuildPass =
  | 'blockout'
  | 'structural-pass'
  | 'form-refinement'
  | 'material-pass'
  | 'surface-pass'
  | 'lighting-pass'
  | 'interaction-pass'
  | 'optimization-pass';

const PASS_ORDER: BuildPass[] = [
  'blockout', 'structural-pass', 'form-refinement', 'material-pass',
  'surface-pass', 'lighting-pass', 'interaction-pass', 'optimization-pass',
];

export type RiauBuildingOptions = {
  pass?: BuildPass;
  castShadow?: boolean;
  receiveShadow?: boolean;
  includeSite?: boolean;
};

export type RiauBuildingRuntime = {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh[]>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, { type: 'box'; center: THREE.Vector3; size: THREE.Vector3 }>;
  destructionGroups: Record<string, THREE.Object3D[]>;
};

/* ------------------------------------------------------------------ spec data */

/** Component hierarchy (id -> parent). */
export const COMPONENT_PARENTS: Record<string, string | null> = {
  building: null,
  'site-ground': 'building',
  plinth: 'building',
  'west-block': 'building',
  'east-block': 'building',
  'entrance-wing': 'building',
  'front-portico': 'building',
  tower: 'building',
  'main-roof': 'building',
  'entrance-stairs': 'building',
  'colonnade-ground': 'west-block',
  'colonnade-upper': 'east-block',
  'window-row-ground': 'west-block',
  'window-row-upper': 'east-block',
  frieze: 'east-block',
  'eave-fascia': 'main-roof',
  'gable-pediments': 'main-roof',
  'skirt-roof': 'main-roof',
  'wing-roof': 'main-roof',
  'tower-roof': 'main-roof',
  'portico-roof': 'main-roof',
  'stair-balustrades': 'entrance-stairs',
  selembayung: 'main-roof',
  'oculus-windows': 'gable-pediments',
  'window-mullions': 'window-row-ground',
  'scalloped-valance': 'eave-fascia',
};

const PLINTH_TOP = 1.0;
const BLOCKS = {
  west: { x0: -23.5, x1: -4, z0: -8, z1: 8, y0: PLINTH_TOP, y1: 11.0 },
  east: { x0: -4, x1: 10, z0: -9, z1: 9, y0: PLINTH_TOP, y1: 11.5 },
  tower: { x0: -19, x1: -5, z0: -6, z1: 6, y0: 11.0, y1: 17.5 },
  portico: { x0: -18, x1: -10, z0: 8, z1: 11.5, y0: PLINTH_TOP, y1: 11.0 },
  wing: { x0: 10, x1: 17.5, z0: -7, z1: 7, y0: PLINTH_TOP, y1: 9.0 },
};
const PORCH_FRONT_X = 21;
/** Lower stepped tower section between the tower and the east block (second roof peak in the photo). */
const ANNEX = { x1: -0.5, hz: 5, y0: 11.0, y1: 16.0 };
const PORCH_COL_X = PORCH_FRONT_X - 0.6;
const PORCH_BEAM_Y = BLOCKS.wing.y1 - 1.3;
const STOREY_Y = 6.2;
const DEG = Math.PI / 180;

/** Palettes from evidence/material-analysis.json crops (see spec materials[].albedo). */
const PALETTE = {
  roof: '#4A4450',
  roofDark: '#272A2C',
  wall: '#EEE3BE',
  column: '#E8DCA6',
  frieze: '#9A5E4E',
  friezeDark: '#553C24',
  gold: '#D9B443',
  skylight: '#6FB5A6',
  window: '#2F4A3C',
  plinth: '#26282A',
  lawn: '#7FA14B',
  paving: '#B9B8B0',
  frame: '#D9DAD6',
};

/* ------------------------------------------------------------------ deterministic noise */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ canvas textures */

type TexSet = { map?: THREE.Texture; roughnessMap?: THREE.Texture; bumpMap?: THREE.Texture };

function canvasTexture(
  w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  metresU: number, metresV: number, color = true,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1 / metresU, 1 / metresV); // UVs are authored in metres
  tex.anisotropy = 8;
  if (color) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, n: number, alpha: number, light: string, dark: string) {
  const r = mulberry32(seed);
  for (let i = 0; i < n; i += 1) {
    ctx.fillStyle = r() > 0.5 ? light : dark;
    ctx.globalAlpha = alpha * r();
    const s = 1 + r() * 3;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

/** Roof: shingle courses every 0.33 m along the slope (v), staggered tab joints along the ridge (u). 2 m tile. */
function roofTextures(): TexSet {
  const courses = 6;
  const drawCourses = (mode: 'albedo' | 'rough' | 'bump') => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const r = mulberry32(11);
    const ch = h / courses;
    ctx.fillStyle = mode === 'albedo' ? PALETTE.roof : mode === 'rough' ? '#c8c8c8' : '#808080';
    ctx.fillRect(0, 0, w, h);
    for (let c = 0; c < courses; c += 1) {
      const tabs = 4;
      const tw = w / tabs;
      const off = (c % 2) * tw * 0.5;
      for (let t = -1; t <= tabs; t += 1) {
        const x = t * tw + off;
        if (mode === 'albedo') {
          const v = 46 + Math.floor(r() * 8);
          ctx.fillStyle = `rgb(${v - 1},${v + 2},${v + 4})`;
        } else if (mode === 'rough') {
          const v = 190 + Math.floor(r() * 30);
          ctx.fillStyle = `rgb(${v},${v},${v})`;
        } else {
          ctx.fillStyle = '#9a9a9a';
        }
        ctx.fillRect(x + 1, c * ch + 1, tw - 2, ch - 3);
      }
      // course shadow line (cavity) at the lower edge of each course
      ctx.fillStyle = mode === 'albedo' ? PALETTE.roofDark : mode === 'rough' ? '#f0f0f0' : '#202020';
      ctx.fillRect(0, (c + 1) * ch - 3, w, 3);
    }
    if (mode === 'albedo') speckle(ctx, w, h, 12, 2500, 0.15, '#6a7070', '#24282a');
  };
  return {
    map: canvasTexture(512, 512, drawCourses('albedo'), 2, 2),
    roughnessMap: canvasTexture(256, 256, drawCourses('rough'), 2, 2, false),
    bumpMap: canvasTexture(256, 256, drawCourses('bump'), 2, 2, false),
  };
}

/** Render walls: low-amplitude cream mottling (4 m tile), independent roughness field. */
function wallTextures(): TexSet {
  return {
    map: canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 21, 4000, 0.12, '#f7f1d8', '#c9bf98');
    }, 4, 4),
    roughnessMap: canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#d8d8d8';
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 22, 1500, 0.3, '#ffffff', '#b0b0b0');
    }, 3, 3, false),
  };
}

/** Carved frieze: brown panel with cream diamond lattice + border beads (one 1.6 m x 0.8 m panel). */
function friezeTextures(): TexSet {
  const draw = (mode: 'albedo' | 'bump') => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = mode === 'albedo' ? PALETTE.frieze : '#606060';
    ctx.fillRect(0, 0, w, h);
    const hi = mode === 'albedo' ? '#E6D3A4' : '#e0e0e0';
    const lo = mode === 'albedo' ? PALETTE.friezeDark : '#202020';
    // borders
    ctx.fillStyle = hi;
    ctx.fillRect(0, 0, w, h * 0.1);
    ctx.fillRect(0, h * 0.9, w, h * 0.1);
    // diamond lattice
    const cells = 8;
    const cw = w / cells;
    ctx.lineWidth = Math.max(2, w / 200);
    for (let i = 0; i < cells; i += 1) {
      const cx = i * cw + cw / 2;
      const cy = h / 2;
      ctx.strokeStyle = hi;
      ctx.beginPath();
      ctx.moveTo(cx, h * 0.14);
      ctx.lineTo(cx + cw / 2 - 2, cy);
      ctx.lineTo(cx, h * 0.86);
      ctx.lineTo(cx - cw / 2 + 2, cy);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = lo;
      ctx.beginPath();
      ctx.arc(cx, cy, cw * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hi;
      ctx.beginPath();
      ctx.arc(cx, cy, cw * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  return {
    map: canvasTexture(512, 256, draw('albedo'), 1.6, 0.8),
    bumpMap: canvasTexture(256, 128, draw('bump'), 1.6, 0.8, false),
  };
}

function lawnTextures(): TexSet {
  return {
    map: canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = PALETTE.lawn;
      ctx.fillRect(0, 0, w, h);
      speckle(ctx, w, h, 31, 9000, 0.35, '#9cbd68', '#5f8233');
    }, 6, 6),
  };
}

/* ------------------------------------------------------------------ materials */

type MatKey =
  | 'roof' | 'wall' | 'column' | 'frieze' | 'gold' | 'skylight' | 'window'
  | 'plinth' | 'lawn' | 'paving' | 'frame' | 'dark';

function createMaterials(textured: boolean): Record<MatKey, THREE.Material> {
  const t = textured
    ? { roof: roofTextures(), wall: wallTextures(), frieze: friezeTextures(), lawn: lawnTextures() }
    : null;
  const std = (color: string, roughness: number, metalness = 0, tex?: TexSet, bumpScale = 0.02) =>
    new THREE.MeshStandardMaterial({
      color: tex?.map ? '#ffffff' : color,
      roughness,
      metalness,
      map: tex?.map ?? null,
      roughnessMap: tex?.roughnessMap ?? null,
      bumpMap: tex?.bumpMap ?? null,
      bumpScale,
    });
  const mats: Record<MatKey, THREE.Material> = {
    roof: std(PALETTE.roof, 0.78, 0.05, t?.roof, 0.04),
    wall: std(PALETTE.wall, 0.86, 0, t?.wall),
    column: std(PALETTE.column, 0.62),
    frieze: std(PALETTE.frieze, 0.8, 0, t?.frieze, 0.03),
    gold: std(PALETTE.gold, 0.42, textured ? 0.25 : 0),
    skylight: textured
      ? new THREE.MeshPhysicalMaterial({ color: PALETTE.skylight, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.85, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 })
      : std(PALETTE.skylight, 0.3),
    window: textured
      ? new THREE.MeshPhysicalMaterial({ color: PALETTE.window, roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.2 })
      : std(PALETTE.window, 0.3),
    plinth: std(PALETTE.plinth, 0.7),
    lawn: std(PALETTE.lawn, 0.95, 0, t?.lawn),
    paving: std(PALETTE.paving, 0.85),
    frame: std(PALETTE.frame, 0.5),
    dark: std('#1E2421', 0.6),
  };
  for (const [k, m] of Object.entries(mats)) m.name = `riau-${k}`;
  return mats;
}

/* ------------------------------------------------------------------ geometry batching */

type UvMode = 'box' | 'xy' | 'xz' | 'keep';

/** UVs in metres from positions in a chosen frame (so textures keep world scale on any part size). */
function applyUv(g: THREE.BufferGeometry, mode: UvMode) {
  if (mode === 'keep' && g.getAttribute('uv')) return;
  const pos = g.getAttribute('position');
  const nrm = g.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let u = x, v = y;
    if (mode === 'xz') { u = x; v = z; }
    else if (mode === 'box' && nrm) {
      const ax = Math.abs(nrm.getX(i)), ay = Math.abs(nrm.getY(i)), az = Math.abs(nrm.getZ(i));
      if (ay >= ax && ay >= az) { u = x; v = z; }
      else if (ax >= az) { u = z; v = y; }
      else { u = x; v = y; }
    }
    uv[i * 2] = u;
    uv[i * 2 + 1] = v;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

class Batcher {
  private buckets = new Map<string, { comp: string; mat: MatKey; geoms: THREE.BufferGeometry[] }>();

  add(comp: string, mat: MatKey, geom: THREE.BufferGeometry, uvFrame: THREE.Matrix4 | null, world: THREE.Matrix4, uv: UvMode = 'box') {
    let g = geom.index ? geom.toNonIndexed() : geom.clone();
    geom.dispose();
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (uvFrame) g.applyMatrix4(uvFrame);
    applyUv(g, uv);
    g.applyMatrix4(world);
    const key = `${comp}|${mat}`;
    if (!this.buckets.has(key)) this.buckets.set(key, { comp, mat, geoms: [] });
    this.buckets.get(key)!.geoms.push(g);
  }

  flush(nodes: Record<string, THREE.Object3D>, mats: Record<MatKey, THREE.Material>, rt: RiauBuildingRuntime, cast: boolean, receive: boolean) {
    for (const { comp, mat, geoms } of this.buckets.values()) {
      const merged = mergeGeometries(geoms, false);
      geoms.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mats[mat]);
      mesh.name = `${comp}:${mat}`;
      mesh.castShadow = cast && mat !== 'lawn';
      mesh.receiveShadow = receive;
      mesh.userData.componentId = comp;
      nodes[comp].add(mesh);
      (rt.meshes[comp] ??= []).push(mesh);
    }
    this.buckets.clear();
  }
}

const M = () => new THREE.Matrix4();
const I = new THREE.Matrix4();
function compose(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  return M().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
}

/* ------------------------------------------------------------------ builder */

class RiauBuilder {
  readonly b = new Batcher();
  readonly level: number;
  readonly sockets: Record<string, THREE.Object3D> = {};

  constructor(pass: BuildPass) {
    this.level = PASS_ORDER.indexOf(pass);
  }

  get structural() { return this.level >= 1; }
  get form() { return this.level >= 2; }

  box(comp: string, mat: MatKey, cx: number, cy: number, cz: number, w: number, h: number, d: number, frame: THREE.Matrix4 = I, uv: UvMode = 'box') {
    const local = compose(cx, cy, cz);
    // UVs are computed in the frame the box is authored in (facade/roof frame), then moved to world.
    this.b.add(comp, mat, new THREE.BoxGeometry(w, h, d), local, frame, uv);
  }

  socket(id: string, position: THREE.Vector3) {
    const o = new THREE.Object3D();
    o.name = `socket:${id}`;
    o.position.copy(position);
    this.sockets[id] = o;
  }

  /* ---------------- masses */

  mass(comp: string, blk: { x0: number; x1: number; z0: number; z1: number; y0: number; y1: number }) {
    this.box(comp, 'wall', (blk.x0 + blk.x1) / 2, (blk.y0 + blk.y1) / 2, (blk.z0 + blk.z1) / 2,
      blk.x1 - blk.x0, blk.y1 - blk.y0, blk.z1 - blk.z0);
  }

  /* ---------------- gable roof (local frame: ridge along +X, centred) */

  gableRoof(opts: {
    comp: string; cx: number; cz: number; yEave: number; length: number; halfDepth: number;
    pitchDeg: number; ridgeAxis: 'x' | 'z'; ends: ('+' | '-')[]; eaveOverhang?: number; gableOverhang?: number;
    oculus?: boolean; finialScale?: number; pedimentDrop?: number;
  }) {
    const p = opts.pitchDeg * DEG;
    const oe = opts.eaveOverhang ?? 1.2;
    const og = opts.gableOverhang ?? 0.9;
    const hz = opts.halfDepth;
    const t = 0.28;
    const rise = hz * Math.tan(p);
    const yR = opts.yEave + rise;
    const len = opts.length + og * 2;
    const frame = compose(opts.cx, 0, opts.cz, 0, opts.ridgeAxis === 'x' ? 0 : -Math.PI / 2, 0);
    const run = hz + oe;
    const slabW = run / Math.cos(p);

    for (const side of [1, -1]) {
      // slab: local XZ plane, ridge along X; rotate about X so it descends toward side*Z
      const midZ = side * run / 2;
      const midY = yR - (run * Math.tan(p)) / 2;
      const nY = Math.cos(p), nZ = side * Math.sin(p);
      const slab = compose(0, midY + nY * t / 2, midZ + nZ * t / 2, side * p, 0, 0);
      this.b.add(opts.comp, 'roof', new THREE.BoxGeometry(len, t, slabW), null, M().multiplyMatrices(frame, slab), 'xz');
      // underside soffit shade (dark) so overhang reads
      if (this.structural) {
        // eave fascia (gold board) along the eave edge
        const eaveY = opts.yEave - oe * Math.tan(p);
        this.box('eave-fascia', 'gold', 0, eaveY - 0.12, side * (run + 0.02), len, 0.5, 0.14, frame);
        if (this.form) this.valance(0, eaveY - 0.37, side * (run + 0.02), len, 'x', frame);
      }
    }

    // ridge cap
    if (this.structural) this.box('eave-fascia', 'gold', 0, yR + t + 0.06, 0, len, 0.22, 0.42, frame);

    for (const end of opts.ends) {
      const s = end === '+' ? 1 : -1;
      const xFace = s * (opts.length / 2);
      // pediment: triangle in local (z,y) extruded 0.3 inward along -s*X
      const drop = opts.pedimentDrop ?? 0;
      const shape = new THREE.Shape();
      shape.moveTo(-hz, -drop);
      shape.lineTo(hz, -drop);
      shape.lineTo(hz, 0);
      shape.lineTo(0, rise);
      shape.lineTo(-hz, 0);
      shape.closePath();
      const ped = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
      // shape X -> local Z, extrusion +Z -> local -s*X
      // Ry(+-90) maps the extrusion (+Z, 0..0.3) to +-X; offset so the slab sits just inside the gable line
      // (no negative scale: that would invert triangle winding).
      const pedM = compose(xFace - s * 0.28, opts.yEave, 0, 0, s > 0 ? Math.PI / 2 : -Math.PI / 2, 0);
      this.b.add('gable-pediments', 'wall', ped, null, M().multiplyMatrices(frame, pedM), 'xy');

      if (this.structural) {
        // rake fascia boards (gold) along both slope edges at the gable end
        for (const side of [1, -1]) {
          const midZ = side * run / 2;
          const midY = yR - (run * Math.tan(p)) / 2;
          const rake = compose(s * (len / 2 + 0.04), midY - 0.05, midZ, side * p, 0, 0);
          this.b.add('eave-fascia', 'gold', new THREE.BoxGeometry(0.16, 0.55, slabW + 0.1), null, M().multiplyMatrices(frame, rake), 'box');
          // gold inner rake band on the pediment face
          const inner = compose(xFace + s * 0.06, opts.yEave + rise / 2 - 0.35, side * hz / 2, side * p, 0, 0);
          this.b.add('gable-pediments', 'gold', new THREE.BoxGeometry(0.1, 0.32, hz / Math.cos(p)), null, M().multiplyMatrices(frame, inner), 'box');
        }
        // horizontal gold tie beam at the pediment base
        this.box('gable-pediments', 'gold', xFace + s * 0.08, opts.yEave - drop + 0.12, 0, 0.12, 0.3, hz * 2, frame);
      }
      if (this.form && opts.oculus) {
        const r = Math.min(1.1, rise * 0.17);
        const oy = opts.yEave + rise * 0.36;
        const glass = new THREE.CylinderGeometry(r, r, 0.1, 32);
        this.b.add('oculus-windows', 'window', glass, null, M().multiplyMatrices(frame, compose(xFace + s * 0.08, oy, 0, 0, 0, Math.PI / 2)), 'keep');
        const ring = new THREE.TorusGeometry(r + 0.08, 0.12, 8, 40);
        this.b.add('oculus-windows', 'gold', ring, null, M().multiplyMatrices(frame, compose(xFace + s * 0.14, oy, 0, 0, Math.PI / 2, 0)), 'keep');
      }
      const apex = new THREE.Vector3(s * (len / 2), yR + t * 0.5, 0).applyMatrix4(frame);
      this.socket(`${opts.comp}/apex${end}`, apex);
      if (this.form) this.selembayung(frame, s * (len / 2 + 0.05), yR + t * 0.6, opts.finialScale ?? Math.min(1.6, Math.max(0.8, rise / 4.5)));
    }
  }

  /* ---------------- v2 tier pieces (front faces +Z) */

  /** A straight box between two points (rafter, rake board). */
  beam(comp: string, mat: MatKey, a: THREE.Vector3, b: THREE.Vector3, h: number, d: number) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
    const m = new THREE.Matrix4().compose(a.clone().add(b).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    this.b.add(comp, mat, new THREE.BoxGeometry(len, h, d), null, m, 'box');
  }

  /** Upswept gold horn at an eave tip (the lentik kick), curling outward along sideX. */
  kickTip(comp: string, x: number, y: number, z: number, sideX: number, scale = 1) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.5, 0.12, 0), new THREE.Vector3(0.95, 0.5, 0), new THREE.Vector3(1.05, 1.0, 0),
    ].map((v) => v.multiplyScalar(scale)));
    this.b.add(comp, 'gold', new THREE.TubeGeometry(curve, 16, 0.12 * scale, 6, false), null, compose(x, y, z, 0, sideX > 0 ? 0 : Math.PI, 0), 'keep');
  }

  /** Flat triangle facing +Z (extruded 0.3 back), centre x, base y0 with half-width hw, apex y1. */
  triangle(comp: string, mat: MatKey, cx: number, z: number, y0: number, hw: number, y1: number, depth = 0.3) {
    const s = new THREE.Shape();
    s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(0, y1 - y0); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
    this.b.add(comp, mat, g, null, compose(cx, y0, z - depth), 'xy');
  }

  /**
   * Closed hip skirt (v2 tier B): a truncated pyramid from the outer eave rectangle up to the foot of
   * the crown walls. Four trapezoid planes meet along the hip lines, so no gap opens at the corners
   * (the four independent slabs of skirtRoof leave open triangles beside the crown).
   */
  hipSkirt(outer: { x0: number; x1: number; z0: number; z1: number }, inner: { x0: number; x1: number; z0: number; z1: number },
    yEdge: number, yTop: number, comp = 'skirt-roof') {
    const o = [
      new THREE.Vector3(outer.x0, yEdge, outer.z1), new THREE.Vector3(outer.x1, yEdge, outer.z1),
      new THREE.Vector3(outer.x1, yEdge, outer.z0), new THREE.Vector3(outer.x0, yEdge, outer.z0),
    ];
    const n = [
      new THREE.Vector3(inner.x0, yTop, inner.z1), new THREE.Vector3(inner.x1, yTop, inner.z1),
      new THREE.Vector3(inner.x1, yTop, inner.z0), new THREE.Vector3(inner.x0, yTop, inner.z0),
    ];
    const pos: number[] = [];
    const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => {
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      pos.push(a.x, a.y - 0.2, a.z, c.x, c.y - 0.2, c.z, b.x, b.y - 0.2, b.z); // underside, 0.2 below
    };
    for (let i = 0; i < 4; i += 1) {
      const j = (i + 1) % 4;
      // outward-facing winding: outer edge i->j, inner edge j->i
      tri(o[i], o[j], n[j]);
      tri(o[i], n[j], n[i]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals();
    this.b.add(comp, 'roof', g, null, I, 'box');

    if (this.structural) {
      // gold fascia and lebah bergantung along the four eaves
      const sides: [number, number, number, number, 'x' | 'z'][] = [
        [(outer.x0 + outer.x1) / 2, outer.z1 + 0.05, outer.x1 - outer.x0, 0, 'x'],
        [(outer.x0 + outer.x1) / 2, outer.z0 - 0.05, outer.x1 - outer.x0, 0, 'x'],
        [outer.x1 + 0.05, (outer.z0 + outer.z1) / 2, outer.z1 - outer.z0, 1, 'z'],
        [outer.x0 - 0.05, (outer.z0 + outer.z1) / 2, outer.z1 - outer.z0, 1, 'z'],
      ];
      for (const [cx, cz, len, rot, axis] of sides) {
        if (rot) this.box('eave-fascia', 'gold', cx, yEdge - 0.12, cz, 0.14, 0.45, len);
        else this.box('eave-fascia', 'gold', cx, yEdge - 0.12, cz, len, 0.45, 0.14);
        if (this.form) this.valance(axis === 'x' ? cx : cx, yEdge - 0.34, cz, len, axis, I);
      }
      // gold hip boards on all four hip lines, with upswept tips at the outer corners
      for (let i = 0; i < 4; i += 1) {
        this.beam('eave-fascia', 'gold', o[i].clone().setY(yEdge + 0.05), n[i].clone().setY(yTop + 0.1), 0.45, 0.28);
        if (this.form) this.kickTip('selembayung', o[i].x, yEdge, o[i].z, o[i].x > 0 ? 1 : -1, 1.1);
      }
    }
  }

  /**
   * One roof tier of the balai: a low gable roof running back from the facade, a small steep
   * gablet with a gold pediment at the front, a grey front pent (emper) below it, and long gold
   * rakes from the apex to upswept eave tips. Measured from the elevation (see v2 spec).
   */
  tierGablet(o: {
    comp: string; cx?: number; zf: number; depth: number;
    yWall: number; halfBack: number; backPitch: number; overhang?: number;
    yApex: number; yBase: number; halfTri: number;
    pentTop: number; yEave: number; halfPent: number; halfEave: number; pentPitch?: number;
    finialScale?: number;
  }) {
    const cx = o.cx ?? 0;
    // back roof (no pediments) plus a wall filler closing its front gable opening
    this.gableRoof({ comp: o.comp, cx, cz: o.zf - o.depth / 2, yEave: o.yWall, length: o.depth, halfDepth: o.halfBack,
      pitchDeg: o.backPitch, ridgeAxis: 'z', ends: [], eaveOverhang: o.overhang ?? 1.6, gableOverhang: 0.1 });
    const backRise = o.halfBack * Math.tan(o.backPitch * DEG);
    this.triangle(o.comp, 'wall', cx, o.zf, o.yWall - 0.01, o.halfBack, o.yWall + backRise, 0.25);
    this.triangle(o.comp, 'wall', cx, o.zf - o.depth + 0.25, o.yWall - 0.01, o.halfBack, o.yWall + backRise, 0.25);

    // front pent (emper): from pentTop at the facade down/forward to the eave
    const pp = (o.pentPitch ?? 32) * DEG;
    const drop = o.pentTop - o.yEave;
    const run = drop / Math.tan(pp);
    const slab = drop / Math.sin(pp);
    const pentM = compose(cx, (o.pentTop + o.yEave) / 2, o.zf + run / 2, pp, 0, 0);
    this.b.add(o.comp, 'roof', new THREE.BoxGeometry(o.halfPent * 2, 0.24, slab), null, pentM, 'xz');
    const zEave = o.zf + run;
    if (this.structural) {
      this.box('eave-fascia', 'gold', cx, o.yEave - 0.12, zEave + 0.04, o.halfPent * 2, 0.42, 0.14);
      if (this.form) this.valance(cx, o.yEave - 0.36, zEave + 0.04, o.halfPent * 2, 'x', I);
    }

    // gablet: small steep gable standing on the pent, its gold pediment facing front
    const zg = o.zf + run * 0.3;
    const yb = o.pentTop - drop * 0.3 + 0.05; // pent surface height at zg, so the gablet sits on it
    const gPitch = Math.atan((o.yApex - yb) / o.halfTri) / DEG;
    this.gableRoof({ comp: o.comp, cx, cz: zg - 2.2, yEave: yb, length: 4.4, halfDepth: o.halfTri,
      pitchDeg: gPitch, ridgeAxis: 'z', ends: [], eaveOverhang: 0.4, gableOverhang: 0.05 });
    this.triangle('gable-pediments', 'gold', cx, zg + 0.02, yb, o.halfTri, o.yApex, 0.3);
    if (this.structural) {
      this.box('gable-pediments', 'gold', cx, yb + 0.1, zg + 0.08, o.halfTri * 2 + 0.4, 0.3, 0.16);
      // gold rakes: down the gablet edge, then along the pent surface to the eave tip, then the upswept kick
      for (const s of [-1, 1]) {
        const a = new THREE.Vector3(cx, o.yApex + 0.1, zg + 0.14);
        const m = new THREE.Vector3(cx + s * (o.halfTri + 0.3), yb + 0.05, zg + 0.14);
        const b = new THREE.Vector3(cx + s * o.halfEave, o.yEave + 0.1, zEave + 0.1);
        this.beam('eave-fascia', 'gold', a, m, 0.5, 0.3);
        this.beam('eave-fascia', 'gold', m, b, 0.5, 0.3);
        if (this.form) this.kickTip('selembayung', b.x, b.y, b.z, s, 1.2);
      }
    }
    if (this.form) {
      const frame = compose(cx, 0, zg + 0.12, 0, -Math.PI / 2, 0);
      this.selembayung(frame, 0, o.yApex + 0.15, o.finialScale ?? 1.4);
    }
    this.socket(`${o.comp}/apex`, new THREE.Vector3(cx, o.yApex, zg));
  }

  /** Crossed horn pair in the gable plane (local ZY at x), tips curling outward and down. */
  selembayung(frame: THREE.Matrix4, x: number, y: number, scale: number) {
    const pts = [
      [-0.8, -0.72], [-0.38, -0.3], [0.05, 0.18], [0.36, 0.62], [0.5, 1.0], [0.72, 1.28], [1.02, 1.32], [1.18, 1.12],
    ];
    for (const mirror of [1, -1]) {
      const curve = new THREE.CatmullRomCurve3(pts.map(([z, yy]) => new THREE.Vector3(0, yy * scale, mirror * z * scale)));
      const tube = new THREE.TubeGeometry(curve, 40, 0.17 * scale, 8, false);
      // taper: shrink radius toward the tip
      const pos = tube.getAttribute('position');
      const seg = 40, radial = 9;
      for (let i = 0; i <= seg; i += 1) {
        const c = curve.getPointAt(i / seg);
        const k = 1 - 0.55 * (i / seg);
        for (let j = 0; j < radial; j += 1) {
          const idx = i * radial + j;
          pos.setXYZ(idx, c.x + (pos.getX(idx) - c.x) * k, c.y + (pos.getY(idx) - c.y) * k, c.z + (pos.getZ(idx) - c.z) * k);
        }
      }
      tube.computeVertexNormals();
      this.b.add('selembayung', 'gold', tube, null, M().multiplyMatrices(frame, compose(x, y, 0)), 'keep');
    }
    // small knob where the horns cross
    this.b.add('selembayung', 'gold', new THREE.SphereGeometry(0.2 * scale, 12, 8), null, M().multiplyMatrices(frame, compose(x, y + 0.12 * scale, 0)), 'keep');
  }

  /** Lebah bergantung: row of small downward teeth under an eave line. */
  valance(cx: number, y: number, cz: number, length: number, axis: 'x' | 'z', frame: THREE.Matrix4) {
    const n = Math.floor(length / 0.42);
    for (let i = 0; i < n; i += 1) {
      const u = -length / 2 + (i + 0.5) * (length / n);
      const cone = new THREE.ConeGeometry(0.16, 0.34, 4, 1);
      const px = axis === 'x' ? cx + u : cx;
      const pz = axis === 'z' ? cz + u : cz;
      this.b.add('scalloped-valance', 'gold', cone, null, M().multiplyMatrices(frame, compose(px, y, pz, Math.PI, Math.PI / 4, 0)), 'keep');
    }
  }

  /** Pent (lean-to) skirt roof ring around an upper storey: 4 slabs from the outer eave up to the inner wall line. */
  skirtRoof(outer: { x0: number; x1: number; z0: number; z1: number }, inner: { x0: number; x1: number; z0: number; z1: number }, yWall: number, pitchDeg: number) {
    const p = pitchDeg * DEG;
    const oe = 1.3;
    const t = 0.26;
    const ox0 = outer.x0 - oe, ox1 = outer.x1 + oe, oz0 = outer.z0 - oe, oz1 = outer.z1 + oe;
    const yEdge = yWall - oe * Math.tan(p);
    const sides: { axis: 'x' | 'z'; sign: number; edge: number; innerLine: number; len: number; c: number }[] = [
      { axis: 'z', sign: 1, edge: oz1, innerLine: inner.z1, len: ox1 - ox0, c: (ox0 + ox1) / 2 },
      { axis: 'z', sign: -1, edge: oz0, innerLine: inner.z0, len: ox1 - ox0, c: (ox0 + ox1) / 2 },
      { axis: 'x', sign: 1, edge: ox1, innerLine: inner.x1, len: oz1 - oz0, c: (oz0 + oz1) / 2 },
      { axis: 'x', sign: -1, edge: ox0, innerLine: inner.x0, len: oz1 - oz0, c: (oz0 + oz1) / 2 },
    ];
    for (const s of sides) {
      const run = Math.abs(s.edge - s.innerLine) + 0.4;
      const w = run / Math.cos(p);
      const mid = (s.edge + s.innerLine) / 2 + s.sign * -0.2;
      const yMid = yEdge + (run / 2) * Math.tan(p);
      const frame = s.axis === 'z'
        ? compose(s.c, 0, 0)
        : compose(0, 0, s.c, 0, Math.PI / 2, 0);
      // in frame: length along local X, slope descends toward sign*local Z
      const localMid = mid; // edge coordinates are world z (z sides) or world x, which Ry(+90) maps to local z
      const nY = Math.cos(p), nZ = s.sign * Math.sin(p);
      const slab = compose(0, yMid + nY * t / 2, localMid + nZ * t / 2, s.sign * p, 0, 0);
      this.b.add('skirt-roof', 'roof', new THREE.BoxGeometry(s.len, t, w), null, M().multiplyMatrices(frame, slab), 'xz');
      if (this.structural) {
        this.box('eave-fascia', 'gold', 0, yEdge - 0.12, s.edge + s.sign * 0.02, s.len, 0.45, 0.14, frame);
        if (this.form) this.valance(0, yEdge - 0.34, s.edge + s.sign * 0.02, s.len, 'x', frame);
      }
    }
    // upturned gold horn tips at the four skirt corners
    if (this.form) {
      for (const [x, z] of [[ox0, oz0], [ox0, oz1], [ox1, oz0], [ox1, oz1]]) {
        const ang = Math.atan2(z - (oz0 + oz1) / 2, x - (ox0 + ox1) / 2);
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.6, 0, 0), new THREE.Vector3(0.1, 0.15, 0), new THREE.Vector3(0.6, 0.6, 0), new THREE.Vector3(0.75, 1.1, 0),
        ]);
        this.b.add('selembayung', 'gold', new THREE.TubeGeometry(curve, 16, 0.1, 6, false), null, compose(x, yEdge + 0.1, z, 0, -ang, 0), 'keep');
      }
    }
  }

  /* ---------------- facades (local frame: u along +X, wall plane z=0, outward +Z) */

  facade(opts: {
    origin: [number, number]; dir: '+z' | '-z' | '+x' | '-x'; length: number; y0: number; yTop: number;
    storeyY?: number; bay?: number; columns?: 'giant' | 'pilaster' | 'none'; lower?: 'window' | 'glass' | 'none';
    upper?: 'arch' | 'none'; frieze?: boolean; skip?: [number, number][]; colComp?: string; winUpperComp?: string;
  }) {
    if (!this.structural) return;
    const ry = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 }[opts.dir];
    const frame = compose(opts.origin[0], 0, opts.origin[1], 0, ry, 0);
    const L = opts.length;
    const bays = Math.max(1, Math.round(L / (opts.bay ?? 3.2)));
    const bw = L / bays;
    const ys = opts.storeyY ?? (opts.y0 + opts.yTop) / 2;
    const colComp = opts.colComp ?? 'colonnade-ground';
    const upComp = opts.winUpperComp ?? 'window-row-upper';
    const skipped = (u: number) => (opts.skip ?? []).some(([a, b]) => u > a - 0.3 && u < b + 0.3);

    // storey band (projecting cream string course) and plinth base course
    this.box('frieze', 'wall', L / 2, ys - 0.55, 0.12, L, 0.18, 0.28, frame);

    for (let i = 0; i <= bays; i += 1) {
      const u = i * bw;
      if (skipped(u)) continue;
      if (opts.columns && opts.columns !== 'none') {
        const r = opts.columns === 'giant' ? 0.36 : 0.26;
        const h = opts.yTop - opts.y0 - 1.6;
        const col = new THREE.CylinderGeometry(r, r * 1.06, h, 16);
        this.b.add(colComp, 'column', col, null, M().multiplyMatrices(frame, compose(u, opts.y0 + h / 2 + 0.3, r + 0.08)), 'keep');
        this.box(colComp, 'column', u, opts.y0 + 0.2, r + 0.08, r * 2.6, 0.45, r * 2.6, frame);
        if (this.form) {
          this.box(colComp, 'column', u, opts.yTop - 1.2, r + 0.08, r * 2.6, 0.36, r * 2.6, frame);
          const torus = new THREE.TorusGeometry(r * 1.08, 0.07, 6, 20);
          this.b.add(colComp, 'column', torus, null, M().multiplyMatrices(frame, compose(u, opts.yTop - 1.48, r + 0.08, Math.PI / 2, 0, 0)), 'keep');
          this.b.add(colComp, 'column', new THREE.TorusGeometry(r * 1.08, 0.07, 6, 20), null, M().multiplyMatrices(frame, compose(u, ys - 0.2, r + 0.08, Math.PI / 2, 0, 0)), 'keep');
        }
      }
    }

    for (let i = 0; i < bays; i += 1) {
      const uc = (i + 0.5) * bw;
      if (skipped(uc)) continue;
      const w = Math.min(1.7, bw * 0.5);
      // frieze panels: one at the storey line, one under the eave
      if (opts.frieze !== false) {
        this.box('frieze', 'frieze', uc, ys + 0.1, 0.07, bw, 1.5, 0.1, frame, 'xy');
        this.box('frieze', 'frieze', uc, opts.yTop - 0.7, 0.07, bw, 1.0, 0.1, frame, 'xy');
      }
      if (opts.lower === 'window') {
        const h = Math.min(3.0, ys - opts.y0 - 1.7);
        this.window(uc, opts.y0 + 0.9 + h / 2, w, h, frame, 'window-row-ground', false);
      } else if (opts.lower === 'glass') {
        const h = ys - opts.y0 - 1.0;
        this.box('window-row-ground', 'window', uc, opts.y0 + 0.3 + h / 2, 0.03, bw - 0.9, h, 0.06, frame);
        if (this.form) {
          for (const k of [-1, 0, 1]) this.box('window-mullions', 'dark', uc + k * (bw - 0.9) / 3, opts.y0 + 0.3 + h / 2, 0.09, 0.08, h, 0.08, frame);
        }
      }
      if (opts.upper === 'arch') {
        const top = opts.yTop - 1.25;
        const bottom = ys + 0.55;
        const h = Math.max(1.2, top - bottom);
        this.window(uc, bottom + h / 2, w * 0.85, h, frame, upComp, true);
      }
    }
  }

  window(u: number, yc: number, w: number, h: number, frame: THREE.Matrix4, comp: string, arch: boolean) {
    const glassShape = new THREE.Shape();
    const hw = w / 2;
    const rectH = arch ? h - hw : h;
    glassShape.moveTo(-hw, -h / 2);
    glassShape.lineTo(hw, -h / 2);
    glassShape.lineTo(hw, -h / 2 + rectH);
    if (arch) glassShape.absarc(0, -h / 2 + rectH, hw, 0, Math.PI, false);
    else glassShape.lineTo(-hw, -h / 2 + rectH);
    glassShape.lineTo(-hw, -h / 2);
    const glass = new THREE.ShapeGeometry(glassShape, 16);
    this.b.add(comp, 'window', glass, null, M().multiplyMatrices(frame, compose(u, yc, 0.025)), 'keep');
    // surround frame: outer shape minus glass
    const f = 0.16;
    const outer = new THREE.Shape();
    outer.moveTo(-hw - f, -h / 2 - f);
    outer.lineTo(hw + f, -h / 2 - f);
    outer.lineTo(hw + f, -h / 2 + rectH);
    if (arch) outer.absarc(0, -h / 2 + rectH, hw + f, 0, Math.PI, false);
    else { outer.lineTo(hw + f, -h / 2 + rectH + f); outer.lineTo(-hw - f, -h / 2 + rectH + f); }
    outer.lineTo(-hw - f, -h / 2 - f);
    outer.holes.push(new THREE.Path(glassShape.getPoints(16)));
    const surround = new THREE.ExtrudeGeometry(outer, { depth: 0.12, bevelEnabled: false, curveSegments: 16 });
    this.b.add(comp, 'column', surround, null, M().multiplyMatrices(frame, compose(u, yc, 0.0)), 'keep');
    // sill
    this.box(comp, 'column', u, yc - h / 2 - f - 0.06, 0.12, w + f * 2 + 0.2, 0.12, 0.26, frame);
    if (this.form) {
      this.box('window-mullions', 'column', u, yc - (arch ? hw / 2 : 0), 0.06, 0.07, rectH, 0.06, frame);
      this.box('window-mullions', 'column', u, yc - h / 2 + rectH * 0.62, 0.06, w, 0.07, 0.06, frame);
    }
  }
}

/* ------------------------------------------------------------------ main factory */

export function createRiauBuildingModel(options: RiauBuildingOptions = {}): THREE.Group {
  const pass = options.pass ?? 'optimization-pass';
  const B = new RiauBuilder(pass);
  const textured = B.level >= PASS_ORDER.indexOf('material-pass');
  const mats = createMaterials(textured);
  const root = new THREE.Group();
  root.name = 'building';

  const rt: RiauBuildingRuntime = { nodes: {}, meshes: {}, sockets: {}, colliders: {}, destructionGroups: {} };
  for (const [id, parent] of Object.entries(COMPONENT_PARENTS)) {
    const node = id === 'building' ? root : new THREE.Group();
    node.name = id;
    node.userData.componentId = id;
    rt.nodes[id] = node;
    if (parent) rt.nodes[parent].add(node);
  }

  const { west, east, tower, portico, wing } = BLOCKS;

  /* site + plinth */
  if (options.includeSite !== false) {
    B.box('site-ground', 'lawn', 2, -0.1, 4, 110, 0.2, 80, I, 'box');
    B.box('site-ground', 'paving', 2, 0.02, 0, 58, 0.06, 26);
    B.box('site-ground', 'paving', PORCH_FRONT_X + 12, 0.02, 0, 22, 0.06, 7);
  }
  B.box('plinth', 'plinth', (west.x0 + PORCH_FRONT_X) / 2, PLINTH_TOP / 2, 0, PORCH_FRONT_X - west.x0 + 1.2, PLINTH_TOP, 19.2);
  B.box('plinth', 'plinth', (portico.x0 + portico.x1) / 2, PLINTH_TOP / 2, 10.3, portico.x1 - portico.x0 + 1.2, PLINTH_TOP, 3.4);
  B.box('plinth', 'column', (west.x0 + PORCH_FRONT_X) / 2, PLINTH_TOP + 0.05, 0, PORCH_FRONT_X - west.x0 + 1.4, 0.1, 19.4);

  /* masses */
  B.mass('west-block', west);
  B.mass('east-block', east);
  B.mass('tower', { ...tower, y0: tower.y0 });
  B.mass('front-portico', portico);
  B.mass('tower', { x0: BLOCKS.tower.x1 - 0.5, x1: ANNEX.x1, z0: -ANNEX.hz, z1: ANNEX.hz, y0: ANNEX.y0, y1: ANNEX.y1 });
  B.mass('entrance-wing', wing);
  // porch zone: entrance hall recessed glazing wall + porch floor
  B.box('entrance-wing', 'window', wing.x1 + 0.05, (PLINTH_TOP + PORCH_BEAM_Y) / 2, 0, 0.1, PORCH_BEAM_Y - PLINTH_TOP, 8);
  B.box('entrance-wing', 'wall', (wing.x1 + PORCH_FRONT_X) / 2, PORCH_BEAM_Y + 0.65, 0, PORCH_FRONT_X - wing.x1, 1.3, 14.2);

  /* roofs */
  // tower gable roof (highest), both ends
  B.gableRoof({ comp: 'tower-roof', cx: (tower.x0 + tower.x1) / 2, cz: 0, yEave: tower.y1, length: tower.x1 - tower.x0,
    halfDepth: (tower.z1 - tower.z0) / 2, pitchDeg: 46, ridgeAxis: 'x', ends: ['+', '-'], oculus: true, finialScale: 1.7 });
  // stepped tower annex: a lower gable in front of the tower, facing the entrance (+X) -- the photo's second top peak
  B.gableRoof({ comp: 'tower-roof', cx: (tower.x1 + ANNEX.x1) / 2 - 0.5, cz: 0, yEave: ANNEX.y1, length: ANNEX.x1 - tower.x1 + 1,
    halfDepth: ANNEX.hz, pitchDeg: 48, ridgeAxis: 'x', ends: ['+'], oculus: true, finialScale: 1.5 });
  // east block gable roof
  B.gableRoof({ comp: 'main-roof', cx: (east.x0 + east.x1) / 2, cz: 0, yEave: east.y1, length: east.x1 - east.x0,
    halfDepth: (east.z1 - east.z0) / 2, pitchDeg: 45, ridgeAxis: 'x', ends: ['+', '-'], oculus: false, finialScale: 1.8 });
  // entrance wing roof (gable at the porch front)
  B.gableRoof({ comp: 'wing-roof', cx: (east.x1 + PORCH_FRONT_X) / 2 + 0.4, cz: 0, yEave: wing.y1, length: PORCH_FRONT_X - east.x1 - 0.8,
    halfDepth: (wing.z1 - wing.z0) / 2, pitchDeg: 42, ridgeAxis: 'x', ends: ['+'], oculus: true, finialScale: 1.5, pedimentDrop: 0.0 });
  // portico gable roof facing +Z (ridge along Z); starts inside the skirt
  B.gableRoof({ comp: 'portico-roof', cx: (portico.x0 + portico.x1) / 2, cz: (5 + portico.z1) / 2, yEave: portico.y1, length: portico.z1 - 5,
    halfDepth: (portico.x1 - portico.x0) / 2, pitchDeg: 44, ridgeAxis: 'z', ends: ['+'], oculus: true, finialScale: 1.3 });
  // skirt ring around the tower over the west block
  B.skirtRoof(west, tower, west.y1, 32);

  /* facades */
  // west block (two storeys, giant columns, frieze)
  B.facade({ origin: [west.x0, west.z1], dir: '+z', length: portico.x0 - west.x0, y0: west.y0, yTop: west.y1, storeyY: STOREY_Y, columns: 'giant', lower: 'window', upper: 'arch' });
  B.facade({ origin: [portico.x1, west.z1], dir: '+z', length: west.x1 - portico.x1, y0: west.y0, yTop: west.y1, storeyY: STOREY_Y, columns: 'giant', lower: 'window', upper: 'arch' });
  B.facade({ origin: [west.x1, west.z0], dir: '-z', length: west.x1 - west.x0, y0: west.y0, yTop: west.y1, storeyY: STOREY_Y, columns: 'giant', lower: 'window', upper: 'arch' });
  B.facade({ origin: [west.x0, west.z0], dir: '-x', length: west.z1 - west.z0, y0: west.y0, yTop: west.y1, storeyY: STOREY_Y, columns: 'giant', lower: 'window', upper: 'arch' });
  // portico front + sides
  B.facade({ origin: [portico.x0, portico.z1], dir: '+z', length: portico.x1 - portico.x0, y0: portico.y0, yTop: portico.y1, storeyY: STOREY_Y, bay: 2.7, columns: 'giant', lower: 'window', upper: 'arch' });
  // east block
  B.facade({ origin: [east.x0, east.z1], dir: '+z', length: east.x1 - east.x0, y0: east.y0, yTop: east.y1, storeyY: STOREY_Y, columns: 'giant', lower: 'window', upper: 'arch' });
  B.facade({ origin: [east.x1, east.z0], dir: '-z', length: east.x1 - east.x0, y0: east.y0, yTop: east.y1, storeyY: STOREY_Y, columns: 'giant', lower: 'window', upper: 'arch' });
  B.facade({ origin: [east.x1, east.z1], dir: '+x', length: east.z1 - wing.z1, y0: east.y0, yTop: east.y1, storeyY: STOREY_Y, bay: 2, columns: 'giant', lower: 'window', upper: 'none', frieze: true });
  B.facade({ origin: [east.x1, wing.z0], dir: '+x', length: wing.z0 - east.z0, y0: east.y0, yTop: east.y1, storeyY: STOREY_Y, bay: 2, columns: 'giant', lower: 'window', upper: 'none', frieze: true });
  // tower storey (pilasters + arched windows; lower part hidden under the skirt)
  B.facade({ origin: [tower.x0, tower.z1], dir: '+z', length: tower.x1 - tower.x0, y0: 12.4, yTop: tower.y1, storeyY: 12.8, bay: 2.7, columns: 'pilaster', lower: 'none', upper: 'arch', colComp: 'colonnade-upper' });
  B.facade({ origin: [tower.x1, tower.z0], dir: '-z', length: tower.x1 - tower.x0, y0: 12.4, yTop: tower.y1, storeyY: 12.8, bay: 2.7, columns: 'pilaster', lower: 'none', upper: 'arch', colComp: 'colonnade-upper' });
  B.facade({ origin: [tower.x1, tower.z1], dir: '+x', length: tower.z1 - tower.z0, y0: 12.4, yTop: tower.y1, storeyY: 12.8, bay: 2.7, columns: 'pilaster', lower: 'none', upper: 'arch', colComp: 'colonnade-upper' });
  B.facade({ origin: [tower.x0, tower.z0], dir: '-x', length: tower.z1 - tower.z0, y0: 12.4, yTop: tower.y1, storeyY: 12.8, bay: 2.7, columns: 'pilaster', lower: 'none', upper: 'arch', colComp: 'colonnade-upper' });
  // entrance wing sides: colonnade in front of dark glazing
  B.facade({ origin: [wing.x0, wing.z1], dir: '+z', length: wing.x1 - wing.x0, y0: wing.y0, yTop: wing.y1, storeyY: PORCH_BEAM_Y, bay: 2.8, columns: 'giant', lower: 'glass', upper: 'none', frieze: false });
  B.facade({ origin: [wing.x1, wing.z0], dir: '-z', length: wing.x1 - wing.x0, y0: wing.y0, yTop: wing.y1, storeyY: PORCH_BEAM_Y, bay: 2.8, columns: 'giant', lower: 'glass', upper: 'none', frieze: false });
  // porch columns at the entrance front (x = 26.4)
  if (B.structural) {
    for (const z of [-6.4, -3.4, 3.4, 6.4]) {
      const h = PORCH_BEAM_Y - PLINTH_TOP;
      B.b.add('colonnade-ground', 'column', new THREE.CylinderGeometry(0.38, 0.4, h, 16), null, compose(PORCH_COL_X, PLINTH_TOP + h / 2, z), 'keep');
      B.box('colonnade-ground', 'column', PORCH_COL_X, PLINTH_TOP + 0.2, z, 1, 0.45, 1);
      B.box('colonnade-ground', 'column', PORCH_COL_X, PORCH_BEAM_Y - 0.1, z, 1, 0.35, 1);
    }
    B.box('frieze', 'frieze', PORCH_FRONT_X - 0.05, PORCH_BEAM_Y + 0.65, 0, 0.12, 0.7, 13.8, I, 'box');
  }

  /* entrance stairs + ramps */
  if (B.structural) {
    const steps = 5;
    for (let i = 0; i < steps; i += 1) {
      const h = PLINTH_TOP * (1 - i / steps);
      B.box('entrance-stairs', 'paving', PORCH_FRONT_X + 0.6 + i * 0.32 + 0.16, h / 2, 0, 0.32, h, 6.4);
    }
    for (const z of [-5.6, 5.6]) {
      // ramp wedge
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(3.2, 0); shape.lineTo(0, PLINTH_TOP); shape.closePath();
      const ramp = new THREE.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false });
      B.b.add('entrance-stairs', 'paving', ramp, null, compose(PORCH_FRONT_X + 0.6, 0, z - 1.1), 'box');
      for (const dz of [-1.15, 1.15]) {
        const rail = new THREE.ExtrudeGeometry((() => {
          const s = new THREE.Shape(); s.moveTo(0, PLINTH_TOP); s.lineTo(3.2, 0); s.lineTo(3.2, 0.8); s.lineTo(0, PLINTH_TOP + 0.8); s.closePath(); return s;
        })(), { depth: 0.22, bevelEnabled: false });
        B.b.add('stair-balustrades', 'plinth', rail, null, compose(PORCH_FRONT_X + 0.6, 0, z + dz - 0.11), 'box');
      }
    }
  }

  B.b.flush(rt.nodes, mats, rt, options.castShadow ?? true, options.receiveShadow ?? true);
  return finalizeModel(root, B, rt, pass, COMPONENT_PARENTS);
}

/** Sockets, colliders and explode metadata, shared by every factory in this file. */
function finalizeModel(root: THREE.Group, B: RiauBuilder, rt: RiauBuildingRuntime, pass: BuildPass, parents: Record<string, string | null>) {
  for (const [id, sock] of Object.entries(B.sockets)) {
    rt.sockets[id] = sock;
    root.add(sock);
  }
  const roofParent = 'main-roof';
  const centre = new THREE.Box3().setFromObject(root).getCenter(new THREE.Vector3());
  for (const [id, node] of Object.entries(rt.nodes)) {
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) continue;
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    rt.colliders[id] = { type: 'box', center: c, size };
    rt.destructionGroups[id] = [node];
    const dir = c.clone().sub(centre);
    dir.y = Math.max(dir.y, 0) + (parents[id] === roofParent || id === roofParent ? 6 : 0);
    node.userData.explodeDir = dir.multiplyScalar(0.35);
    node.userData.pivot = c.toArray();
  }
  root.userData.buildingRuntime = rt;
  root.userData.pass = pass;
  root.userData.componentParents = parents;
  root.userData.componentIds = Object.keys(parents);
  return root;
}

/** Explode helper: t in [0,1] pushes each component node along its explode direction. */
export function setExplode(root: THREE.Object3D, t: number) {
  const rt = root.userData.buildingRuntime as RiauBuildingRuntime;
  const parents = (root.userData.componentParents as Record<string, string | null> | undefined) ?? COMPONENT_PARENTS;
  for (const [id, node] of Object.entries(rt.nodes)) {
    if (id === 'building') continue;
    const dir = node.userData.explodeDir as THREE.Vector3 | undefined;
    if (!dir) continue;
    // children inherit parent offsets, so only apply the delta relative to the parent's direction
    const parentId = parents[id];
    const parentDir = parentId && parentId !== 'building' ? (rt.nodes[parentId].userData.explodeDir as THREE.Vector3 | undefined) : undefined;
    const delta = parentDir ? dir.clone().sub(parentDir) : dir;
    node.position.copy(delta).multiplyScalar(t);
  }
}

/* ================================================================== v2: front elevation, five roof tiers
 * Reconstructed from referensi/depan-elevasi.jpg (orthographic, 10 px = 1 unit) and depan-foto.jpg.
 * Front faces +Z, the entrance axis is X = 0.
 * Centre roof tiers, top to bottom: A crown gable, B broad skirt, C upper gable, D middle gable,
 * E portico gable. Two smaller gabled wings sit left and right. Depth and rear are inferred.
 */

export const BALAI_PARENTS: Record<string, string | null> = {
  building: null,
  'site-ground': 'building',
  plinth: 'building',
  'central-block': 'building',
  'wing-left': 'building',
  'wing-right': 'building',
  'crown-block': 'building',
  'front-portico': 'building',
  'main-roof': 'building',
  'entrance-stairs': 'building',
  'colonnade-ground': 'central-block',
  'colonnade-upper': 'central-block',
  'window-row-ground': 'central-block',
  'window-row-upper': 'central-block',
  frieze: 'central-block',
  'eave-fascia': 'main-roof',
  'gable-pediments': 'main-roof',
  'skirt-roof': 'main-roof',
  'wing-roof': 'main-roof',
  'crown-roof': 'main-roof',
  'upper-gable-roof': 'main-roof',
  'middle-gable-roof': 'main-roof',
  'portico-roof': 'main-roof',
  'stair-balustrades': 'entrance-stairs',
  selembayung: 'main-roof',
  'oculus-windows': 'gable-pediments',
  'window-mullions': 'window-row-ground',
  'scalloped-valance': 'eave-fascia',
};

const V2 = {
  plinth: 2,
  ground: { x0: -27, x1: 27, z0: -12, z1: 9, y1: 15 },
  centreFront: { x0: -14, x1: 14, z0: 4, z1: 9, y0: 15, y1: 18 },
  upper: { x0: -27, x1: 27, z0: -11, z1: 4, y0: 15, y1: 26 },
  crown: { x0: -12, x1: 12, z0: -9, z1: 1, y0: 26, y1: 33 },
  portico: { x0: -10, x1: 10, z0: 9, z1: 14, beamY: 10.4 },
  wingX: 20.5,
};

export function createRiauBalaiModel(options: RiauBuildingOptions = {}): THREE.Group {
  const pass = options.pass ?? 'optimization-pass';
  const B = new RiauBuilder(pass);
  const mats = createMaterials(B.level >= PASS_ORDER.indexOf('material-pass'));
  const root = new THREE.Group();
  root.name = 'building';
  const rt: RiauBuildingRuntime = { nodes: {}, meshes: {}, sockets: {}, colliders: {}, destructionGroups: {} };
  for (const [id, parent] of Object.entries(BALAI_PARENTS)) {
    const node = id === 'building' ? root : new THREE.Group();
    node.name = id;
    node.userData.componentId = id;
    rt.nodes[id] = node;
    if (parent) rt.nodes[parent].add(node);
  }

  const P = V2.plinth;
  const { ground: G, centreFront: CF, upper: U, crown: C, portico: PO } = V2;

  /* site + plinth */
  if (options.includeSite !== false) {
    B.box('site-ground', 'lawn', 0, -0.1, 4, 110, 0.2, 80, I, 'box');
    B.box('site-ground', 'paving', 0, 0.02, 20, 14, 0.06, 12);
  }
  B.box('plinth', 'plinth', 0, P / 2, (G.z0 + G.z1) / 2, G.x1 - G.x0 + 1.2, P, G.z1 - G.z0 + 1.2);
  B.box('plinth', 'plinth', 0, P / 2, (PO.z0 + PO.z1) / 2 + 0.3, PO.x1 - PO.x0 + 1.2, P, PO.z1 - PO.z0 + 0.6);
  B.box('plinth', 'column', 0, P + 0.05, (G.z0 + G.z1) / 2, G.x1 - G.x0 + 1.4, 0.1, G.z1 - G.z0 + 1.4);

  /* masses: wings, central ground block, centre front block, full-width upper storey, crown */
  B.mass('wing-left', { x0: G.x0, x1: -14, z0: G.z0, z1: G.z1, y0: P, y1: G.y1 });
  B.mass('wing-right', { x0: 14, x1: G.x1, z0: G.z0, z1: G.z1, y0: P, y1: G.y1 });
  B.mass('central-block', { x0: -14, x1: 14, z0: G.z0, z1: G.z1, y0: P, y1: G.y1 });
  B.mass('central-block', CF);
  B.mass('central-block', U);
  B.mass('crown-block', C);
  B.socket('central-block/west-face', new THREE.Vector3(-14, P, 0));
  B.socket('central-block/east-face', new THREE.Vector3(14, P, 0));

  /* roof tiers (A..E) and wing gables, measured from the elevation (Y = (450 - y_px) / 10) */
  // E: portico gable over four columns: cream pediment with oculus, gold triangle at the top
  B.gableRoof({ comp: 'portico-roof', cx: 0, cz: (PO.z0 + PO.z1) / 2, yEave: 11, length: PO.z1 - PO.z0, halfDepth: 10,
    pitchDeg: 32, ridgeAxis: 'z', ends: ['+'], oculus: true, finialScale: 1.3 });
  const eApex = 11 + 10 * Math.tan(32 * DEG);
  B.triangle('gable-pediments', 'gold', 0, PO.z1 + 0.02, eApex - 2.4, 10 * 2.4 / (eApex - 11), eApex - 0.15, 0.2);
  // D: middle tier over the central facade
  B.tierGablet({ comp: 'middle-gable-roof', zf: CF.z1, depth: CF.z1 - CF.z0, yWall: CF.y1, halfBack: 14, backPitch: 16,
    yApex: 26.5, yBase: 20.2, halfTri: 4, pentTop: 20.8, yEave: 18.2, halfPent: 12.7, halfEave: 15.3, finialScale: 1.3 });
  // C: upper tier on the upper storey
  B.tierGablet({ comp: 'upper-gable-roof', zf: U.z1, depth: 5, yWall: U.y1, halfBack: 12, backPitch: 18,
    yApex: 35, yBase: 28.2, halfTri: 3.8, pentTop: 30.4, yEave: 26.6, halfPent: 11.3, halfEave: 15.5, finialScale: 1.4 });
  // B: broad skirt, a closed hip roof from the building edges up to the foot of the crown walls
  B.hipSkirt({ x0: U.x0 - 1.3, x1: U.x1 + 1.3, z0: U.z0 - 1.3, z1: U.z1 + 1.3 }, { x0: C.x0, x1: C.x1, z0: C.z0, z1: C.z1 },
    U.y1 - 0.1, C.y1 + 0.2); // eave just above the upper-storey cornice so no facade part pierces it
  // A: crown tier, the highest gablet, finial front and back
  B.tierGablet({ comp: 'crown-roof', zf: C.z1, depth: C.z1 - C.z0, yWall: C.y1, halfBack: 12, backPitch: 20, overhang: 3,
    yApex: 43, yBase: 36.5, halfTri: 4.8, pentTop: 37.2, yEave: 34.6, halfPent: 14.5, halfEave: 16, finialScale: 1.8 });
  // wings: steep gables with oculus and a gold triangle at the top, a smaller second tier in front
  for (const s of [-1, 1]) {
    const wx = s * V2.wingX;
    B.gableRoof({ comp: 'wing-roof', cx: wx, cz: 6, yEave: G.y1, length: 6, halfDepth: 6.5,
      pitchDeg: 48, ridgeAxis: 'z', ends: ['+'], eaveOverhang: 1.3, oculus: true, finialScale: 1.3 });
    const wApex = G.y1 + 6.5 * Math.tan(48 * DEG);
    B.triangle('gable-pediments', 'gold', wx, G.z1 + 0.02, wApex - 2.8, 6.5 * 2.8 / (wApex - G.y1), wApex - 0.15, 0.2);
    B.gableRoof({ comp: 'wing-roof', cx: wx, cz: 9.6, yEave: G.y1 - 1.6, length: 1.4, halfDepth: 4.2,
      pitchDeg: 40, ridgeAxis: 'z', ends: ['+'], eaveOverhang: 1.0, finialScale: 0.8 });
    for (const k of [-1, 1]) B.kickTip('selembayung', wx + k * (6.5 + 1.3), G.y1 - 1.3 * Math.tan(48 * DEG) - 0.1, 6 + 3.9, k, 0.9);
  }

  /* facades: front */
  const front = { y0: P, yTop: G.y1, storeyY: 8.5, columns: 'giant' as const, lower: 'window' as const, upper: 'arch' as const };
  B.facade({ ...front, origin: [G.x0, G.z1], dir: '+z', length: 13, bay: 4.3 });
  B.facade({ ...front, origin: [14, G.z1], dir: '+z', length: 13, bay: 4.3 });
  B.facade({ ...front, origin: [-14, G.z1], dir: '+z', length: 28, bay: 4, columns: 'none', skip: [[7, 21]] });
  B.facade({ origin: [U.x0, U.z1], dir: '+z', length: U.x1 - U.x0, y0: U.y0, yTop: U.y1, storeyY: 16.6, bay: 3.6,
    columns: 'pilaster', lower: 'none', upper: 'arch', colComp: 'colonnade-upper', winUpperComp: 'window-row-upper' });
  B.facade({ origin: [C.x0, C.z1], dir: '+z', length: C.x1 - C.x0, y0: C.y0, yTop: C.y1, storeyY: 26.6, bay: 3,
    columns: 'pilaster', lower: 'none', upper: 'arch', colComp: 'colonnade-upper', winUpperComp: 'window-row-upper' });

  /* facades: sides and rear (hidden in the references; repeat the front rhythm) */
  B.facade({ ...front, origin: [G.x1, G.z1], dir: '+x', length: G.z1 - G.z0, bay: 4.2 });
  B.facade({ ...front, origin: [G.x0, G.z0], dir: '-x', length: G.z1 - G.z0, bay: 4.2 });
  B.facade({ ...front, origin: [G.x1, G.z0], dir: '-z', length: G.x1 - G.x0, bay: 4.5 });
  const upperSide = { y0: U.y0, yTop: U.y1, storeyY: 16.6, bay: 3.6, columns: 'pilaster' as const, lower: 'none' as const,
    upper: 'arch' as const, colComp: 'colonnade-upper', winUpperComp: 'window-row-upper' };
  B.facade({ ...upperSide, origin: [U.x1, U.z1], dir: '+x', length: U.z1 - U.z0 });
  B.facade({ ...upperSide, origin: [U.x0, U.z0], dir: '-x', length: U.z1 - U.z0 });
  B.facade({ ...upperSide, origin: [U.x1, U.z0], dir: '-z', length: U.x1 - U.x0 });
  const crownSide = { y0: C.y0, yTop: C.y1, storeyY: 26.6, bay: 3, columns: 'pilaster' as const, lower: 'none' as const,
    upper: 'arch' as const, colComp: 'colonnade-upper', winUpperComp: 'window-row-upper' };
  B.facade({ ...crownSide, origin: [C.x1, C.z1], dir: '+x', length: C.z1 - C.z0 });
  B.facade({ ...crownSide, origin: [C.x0, C.z0], dir: '-x', length: C.z1 - C.z0 });
  B.facade({ ...crownSide, origin: [C.x1, C.z0], dir: '-z', length: C.x1 - C.x0 });

  /* portico: columns, beam, ceiling, entrance */
  if (B.structural) {
    const h = PO.beamY - P;
    for (const x of [-9.2, -4.6, 4.6, 9.2]) {
      B.b.add('colonnade-ground', 'column', new THREE.CylinderGeometry(0.55, 0.6, h, 20), null, compose(x, P + h / 2, PO.z1 - 0.7), 'keep');
      B.box('colonnade-ground', 'column', x, P + 0.25, PO.z1 - 0.7, 1.5, 0.5, 1.5);
      B.box('colonnade-ground', 'column', x, PO.beamY - 0.2, PO.z1 - 0.7, 1.4, 0.4, 1.4);
      if (B.form) {
        for (const yy of [P + 1.2, P + h * 0.55, PO.beamY - 0.7]) {
          B.b.add('colonnade-ground', 'column', new THREE.TorusGeometry(0.62, 0.09, 6, 24), null, compose(x, yy, PO.z1 - 0.7, Math.PI / 2, 0, 0), 'keep');
        }
      }
    }
    B.box('frieze', 'frieze', 0, PO.beamY + 0.3, PO.z1 - 0.7, PO.x1 - PO.x0 + 0.6, 0.8, 0.5, I, 'xy');
    B.box('front-portico', 'wall', 0, 10.9, (PO.z0 + PO.z1) / 2, PO.x1 - PO.x0, 0.5, PO.z1 - PO.z0);
    for (const sx of [-1, 1]) B.box('frieze', 'frieze', sx * (PO.x1 - 0.2), PO.beamY + 0.3, (PO.z0 + PO.z1) / 2, 0.4, 0.8, PO.z1 - PO.z0);
    // dark glazed entrance with two arched transoms
    const doorFrame = compose(0, 0, G.z1 + 0.04);
    B.box('window-row-ground', 'window', 0, P + 3.6, G.z1 + 0.04, 12, 7.2, 0.1);
    if (B.form) for (const k of [-2, -1, 0, 1, 2]) B.box('window-mullions', 'dark', k * 2.4, P + 3.6, G.z1 + 0.12, 0.12, 7.2, 0.08);
    for (const x of [-4, 4]) B.window(x, P + 6.4, 2.2, 2.4, doorFrame, 'window-row-ground', true);
    B.box('frieze', 'frieze', 0, G.y1 + 1.5, CF.z1 + 0.06, CF.x1 - CF.x0, 1.0, 0.1, I, 'xy');
  }

  /* entrance stairs with side balustrades */
  if (B.structural) {
    const steps = 5;
    for (let i = 0; i < steps; i += 1) {
      const h = P * (1 - i / steps);
      B.box('entrance-stairs', 'paving', 0, h / 2, PO.z1 + 0.6 + i * 0.7 + 0.35, 10, h, 0.7);
    }
    for (const x of [-5.6, 5.6]) {
      const s = new THREE.Shape();
      s.moveTo(0, P + 1); s.lineTo(0, P); s.lineTo(steps * 0.7 + 0.6, 0); s.lineTo(steps * 0.7 + 0.6, 1); s.closePath();
      const rail = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false });
      B.b.add('stair-balustrades', 'plinth', rail, null, compose(x + 0.25, 0, PO.z1, 0, -Math.PI / 2, 0), 'box');
    }
  }

  B.b.flush(rt.nodes, mats, rt, options.castShadow ?? true, options.receiveShadow ?? true);
  return finalizeModel(root, B, rt, pass, BALAI_PARENTS);
}

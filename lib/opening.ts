// A one-shot signal: resolves when the opening curtain starts to lift (or is skipped).
let resolve: (() => void) | null = null;
export const openingDone: Promise<void> =
  typeof window === 'undefined' ? Promise.resolve() : new Promise<void>((r) => { resolve = r; });
export const finishOpening = () => { resolve?.(); resolve = null; };

// Real loading progress for the preloader: each stage reports once, the total is their weights.
export type LoadStage = 'fonts' | 'module' | 'model' | 'frame';
const WEIGHTS: Record<LoadStage, number> = { fonts: 0.2, module: 0.3, model: 0.3, frame: 0.2 };
const done = new Set<LoadStage>();
export function reportLoad(stage: LoadStage) {
  if (typeof window === 'undefined' || done.has(stage)) return;
  done.add(stage);
  const total = [...done].reduce((s, k) => s + WEIGHTS[k], 0);
  window.dispatchEvent(new CustomEvent('ikpmr-load', { detail: total }));
}
export const loadedSoFar = () => [...done].reduce((s, k) => s + WEIGHTS[k], 0);

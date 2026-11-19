import * as THREE from 'three';

export type PickCandidate<T> = {
  item: T;
  position: THREE.Vector3;
  radius: number;
  /** Trefferradius in px aus dem projizierten Radius. Standard: großzügig für kleine Körper */
  reach?: (radiusPx: number) => number;
  /** Aufschlag auf die Wertung, z. B. damit Planeten vor der Sonne gewinnen */
  penalty?: number;
};

const v = new THREE.Vector3();

/** Der Kandidat unter dem Punkt (x, y) in Bildschirm-Pixeln, oder null. */
export function pickNearest<T>(
  camera: THREE.PerspectiveCamera,
  size: { width: number; height: number },
  x: number,
  y: number,
  candidates: PickCandidate<T>[]
): T | null {
  const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
  let best: T | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const dist = c.position.distanceTo(camera.position);
    v.copy(c.position).project(camera);
    if (v.z > 1) continue;
    const sx = ((v.x + 1) / 2) * size.width;
    const sy = ((1 - v.y) / 2) * size.height;
    const rPx = (c.radius / (dist * tanHalf)) * (size.height / 2);
    const d = Math.hypot(sx - x, sy - y);
    const reach = c.reach ? c.reach(rPx) : Math.max(rPx + 14, 26);
    const score = d - rPx + (c.penalty ?? 0);
    if (d < reach && score < bestScore) {
      best = c.item;
      bestScore = score;
    }
  }
  return best;
}

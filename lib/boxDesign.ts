/**
 * Selbstgebastelter Schaukasten: welche Kugel an welchem Faden hängt und wie
 * sie angemalt ist. Wird lokal gespeichert, damit der Kasten beim nächsten
 * Öffnen wieder so aussieht.
 */
import { readText, writeText } from './storage';

export type BoxDesign = {
  /** Planeten-IDs in der Reihenfolge der Fäden bzw. Bögen (innen nach außen) */
  order: string[];
  /** Bastelfarbe je Planet, fehlt = Originalfarben */
  paint: Record<string, string>;
  /** Aufbau: Kugeln an Fäden (ab Werk) oder Perlen auf Bögen um die Sonne */
  style: 'threads' | 'arcs';
  /** Material: Papier und Pappe (ab Werk) oder Strick und Stoff in Stop-Motion */
  material: 'paper' | 'knit';
};

/** Bastelfarben wie aus dem Tuschkasten. `null` = Originalfarben des Planeten. */
export const PAINTS: { value: string | null; name: string }[] = [
  { value: null, name: 'Original' },
  { value: '#D9534F', name: 'Rot' },
  { value: '#F0A13A', name: 'Orange' },
  { value: '#F2D15C', name: 'Gelb' },
  { value: '#7BC47F', name: 'Grün' },
  { value: '#4FB3BF', name: 'Türkis' },
  { value: '#4A78D0', name: 'Blau' },
  { value: '#8E6CCF', name: 'Lila' },
  { value: '#E58BB5', name: 'Rosa' },
  { value: '#F4EFE4', name: 'Weiß' },
  { value: '#3B3A48', name: 'Graphit' },
];

const KEY = 'schaukasten-design-v1';

export function defaultDesign(ids: string[]): BoxDesign {
  return { order: [...ids], paint: {}, style: 'threads', material: 'paper' };
}

/** Gespeichertes Design übernehmen, aber nur, was zu den heutigen Planeten passt */
export function sanitize(raw: unknown, ids: string[]): BoxDesign {
  const fallback = defaultDesign(ids);
  if (!raw || typeof raw !== 'object') return fallback;
  const r = raw as Partial<BoxDesign>;
  const known = new Set(ids);
  const order = Array.isArray(r.order)
    ? r.order.filter((id, i, a) => known.has(id) && a.indexOf(id) === i)
    : [];
  // Neue Körper (z. B. nach einem Update) hinten anhängen
  for (const id of ids) if (!order.includes(id)) order.push(id);
  const paint: Record<string, string> = {};
  const allowed = new Set(PAINTS.map((p) => p.value));
  if (r.paint && typeof r.paint === 'object') {
    for (const [id, c] of Object.entries(r.paint)) {
      if (known.has(id) && typeof c === 'string' && allowed.has(c)) paint[id] = c;
    }
  }
  const style = r.style === 'arcs' ? 'arcs' : 'threads';
  const material = r.material === 'knit' ? 'knit' : 'paper';
  return { order, paint, style, material };
}

export async function loadDesign(ids: string[]): Promise<BoxDesign> {
  const text = await readText(KEY);
  if (!text) return defaultDesign(ids);
  try {
    return sanitize(JSON.parse(text), ids);
  } catch {
    return defaultDesign(ids);
  }
}

export function saveDesign(d: BoxDesign) {
  return writeText(KEY, JSON.stringify(d));
}

export function isDefaultDesign(d: BoxDesign, ids: string[]) {
  return (
    d.order.every((id, i) => id === ids[i]) &&
    Object.keys(d.paint).length === 0 &&
    d.style === 'threads' &&
    d.material === 'paper'
  );
}

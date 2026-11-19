/**
 * Bögen über der Sonne: jeder Platz in der Reihenfolge ist ein eigener
 * Drahtbogen (halbe Ellipse) um die Sonne, die Kugeln sitzen darauf wie Perlen.
 *
 * Quer steht die Sonne unten in der Mitte, die Bögen spannen sich nach oben.
 * Hochkant steht sie an der linken Wand, die Bögen öffnen sich nach rechts,
 * so wird die ganze Höhe genutzt.
 *
 * Kollisionsfrei per Konstruktion: Für jede Kugel wird auf ihrem Bogen der
 * Winkel mit dem meisten Abstand zu Wänden, Sonne und schon gesetzten Kugeln
 * gesucht. Passt es nicht, werden alle Kugeln gemeinsam kleiner (Maßstab `k`),
 * bis überall Luft ist. Das Ergebnis hängt nur von Reihenfolge und Box ab.
 */

export type ArcBodySpec = {
  id: string;
  /** Kugelradius im Bastel-Maßstab (k = 1) */
  r: number;
  /** Größter Mond als Anteil am Planetenradius, 0 = keine Monde */
  moon: number;
  /** Saturn: Ring macht die Kugel breiter */
  ring?: boolean;
};

export type ArcBox = {
  W: number;
  H: number;
  sunR: number;
  /** Sonne an der linken Wand (hochkant) statt unten */
  side: boolean;
};

export type ArcSlot = {
  x: number;
  y: number;
  /** Maßstab der Kugel */
  k: number;
  arc: {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    /** Ruhewinkel auf dem Bogen */
    theta: number;
    /** Wie weit die Perle hin und her wandern darf, ohne anzustoßen (Weltmaß) */
    sway: number;
    /** Normierter Bogenradius, zum Einordnen beim Umhängen */
    s: number;
  };
};

export type ArcResult = {
  k: number;
  RX: number;
  RY: number;
  cx: number;
  cy: number;
  slots: Record<string, ArcSlot>;
};

/** Abstand Mondbahn zur Kugel, Platz fürs Namensschild über der Kugel, Wandabstand */
const MOON_GAP = 0.08;
const LABEL = 0.6;
const MARGIN = 0.3;
/** So viel Luft muss zwischen allem bleiben */
const MIN_CLEAR = 0.08;

type Ext = { r: number; ex: number; ey: number; top: number };

/** Halbe Breite/Höhe einer Kugel samt Monden (kreisen eng drumherum) und Ring */
export function extentOf(b: ArcBodySpec, k: number): Ext {
  const r = b.r * k;
  let ex = r;
  let ey = r;
  if (b.moon > 0) ex = ey = r + MOON_GAP * k + 2 * r * b.moon;
  if (b.ring) {
    ex = Math.max(ex, 1.95 * r);
    ey = Math.max(ey, 1.1 * r);
  }
  return { r, ex, ey, top: ey + LABEL * k + 0.15 };
}

/** Abstand zweier Kugeln als Kästen; das Schild zählt oben dazu */
function gap(x: number, y: number, e: Ext, px: number, py: number, pe: Ext) {
  const gx = Math.abs(x - px) - (e.ex + pe.ex);
  const gy = y > py ? y - e.ey - (py + pe.top) : py - pe.ey - (y + e.top);
  return Math.max(gx, gy);
}

type Placed = { x: number; y: number; e: Ext; theta: number; rx: number; ry: number; s: number };

function frame(box: ArcBox) {
  return box.side
    ? { cx: -box.W / 2, cy: 0, RX: box.W - MARGIN, RY: box.H / 2 - MARGIN, from: -84, to: 84 }
    : { cx: 0, cy: -box.H / 2, RX: box.W / 2 - MARGIN, RY: box.H - MARGIN, from: 6, to: 174 };
}

/** Wie viel Luft hat eine Kugel an dieser Stelle zu Box und Sonne */
function roomInBox(box: ArcBox, f: ReturnType<typeof frame>, x: number, y: number, e: Ext) {
  const { W, H, sunR } = box;
  let c = Math.min(
    W / 2 - MARGIN - (x + e.ex),
    x - e.ex - (-W / 2 + MARGIN),
    H / 2 - MARGIN - (y + e.top),
    y - e.ey - (-H / 2 + MARGIN)
  );
  // Sonne: Halbkugel am Rand, als Kreis um ihre Mitte
  const dx = Math.max(Math.abs(x - f.cx) - e.ex, 0);
  const dy = Math.max(Math.abs(y - f.cy) - e.ey, 0);
  c = Math.min(c, Math.hypot(dx, dy) - sunR);
  return c;
}

function place(bodies: ArcBodySpec[], box: ArcBox, k: number, pref: number[]) {
  const f = frame(box);
  const E = bodies.map((b) => extentOf(b, k));
  const size = (e: Ext) => Math.max(e.ex, e.ey);
  const s0 = (box.sunR + size(E[0]) + 0.2) / Math.min(f.RX, f.RY);
  // Bögen nach außen verteilt, halb gleichmäßig, halb nach Kugelgröße
  let acc = 0;
  const cum = E.map((e, i) => (acc += i ? size(E[i - 1]) + size(e) : 0));
  const tot = Math.max(acc, 1e-6);
  const n = bodies.length;
  const placed: Placed[] = [];
  let worst = Infinity;
  bodies.forEach((_, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const s = s0 + (0.97 - s0) * (0.5 * t + 0.5 * (cum[i] / tot));
    const rx = s * f.RX;
    const ry = s * f.RY;
    const e = E[i];
    let best: (Placed & { c: number; score: number }) | null = null;
    for (let deg = f.from; deg <= f.to; deg += 1.5) {
      const th = (deg * Math.PI) / 180;
      const x = f.cx + rx * Math.cos(th);
      const y = f.cy + ry * Math.sin(th);
      let c = roomInBox(box, f, x, y, e);
      for (const p of placed) c = Math.min(c, gap(x, y, e, p.x, p.y, p.e));
      const want = box.side ? pref[i] - 90 : pref[i];
      const score = c - 0.003 * Math.abs(deg - want);
      if (!best || score > best.score) best = { x, y, e, theta: th, rx, ry, s, c, score };
    }
    placed.push(best!);
    worst = Math.min(worst, best!.c);
  });
  return { worst, placed, f };
}

/** Kleiner deterministischer Zufall, damit gleiche Reihenfolge = gleiche Anordnung */
function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const BASE_PREF = [60, 120, 35, 145, 90, 50, 130, 25, 155, 90, 70, 110];

export function arcLayout(bodies: ArcBodySpec[], box: ArcBox, tries = 16): ArcResult {
  const seed = bodies.reduce((h, b, i) => h + b.id.charCodeAt(0) * (i + 7) * 131, 17);
  const rand = rng(seed);
  let bestK = 0;
  let bestPref = BASE_PREF;
  for (let t = 0; t < tries; t++) {
    const pref = t === 0 ? BASE_PREF : bodies.map(() => 15 + rand() * 150);
    // Nur weitersuchen, wenn diese Winkel überhaupt etwas Größeres schaffen
    if (bestK > 0 && place(bodies, box, bestK + 0.005, pref).worst < MIN_CLEAR) continue;
    let lo = bestK;
    let hi = 1.1;
    for (let n = 0; n < 9; n++) {
      const k = (lo + hi) / 2;
      if (place(bodies, box, k, pref).worst >= MIN_CLEAR) lo = k;
      else hi = k;
    }
    if (lo > bestK) {
      bestK = lo;
      bestPref = pref;
    }
  }
  const k = Math.max(bestK, 0.3);
  const { placed, f } = place(bodies, box, k, bestPref);

  // Spielraum zum Hin- und Herwandern: knapp die Hälfte der Luft zum engsten Nachbarn,
  // denn der Nachbar wandert auch
  const slots: Record<string, ArcSlot> = {};
  placed.forEach((p, i) => {
    let room = roomInBox(box, f, p.x, p.y, p.e);
    placed.forEach((q, j) => {
      if (j !== i) room = Math.min(room, gap(p.x, p.y, p.e, q.x, q.y, q.e));
    });
    slots[bodies[i].id] = {
      x: p.x,
      y: p.y,
      k,
      arc: {
        cx: f.cx,
        cy: f.cy,
        rx: p.rx,
        ry: p.ry,
        theta: p.theta,
        sway: Math.max(0.02, Math.min(0.9, room * 0.45)),
        s: p.s,
      },
    };
  });
  return { k, RX: f.RX, RY: f.RY, cx: f.cx, cy: f.cy, slots };
}

/** Punkt auf einem Bogen */
export function arcPoint(a: ArcSlot['arc'], theta: number) {
  return { x: a.cx + a.rx * Math.cos(theta), y: a.cy + a.ry * Math.sin(theta) };
}

/** Wie viel Weg ein Winkelschritt an dieser Stelle bedeutet (für Wandern in Weltmaß) */
export function arcSpeed(a: ArcSlot['arc'], theta: number) {
  return Math.max(1e-3, Math.hypot(a.rx * Math.sin(theta), a.ry * Math.cos(theta)));
}

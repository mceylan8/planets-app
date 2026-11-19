/**
 * Schaukasten: ein gebastelter Karton, vorne offen, mit Pappmaché-Planeten an
 * Fäden. Die Planeten sind gedämpfte Pendel: sie wiegen sich leicht, schwingen
 * beim Antippen an und folgen einem Wischen über die Box.
 */
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import * as THREE from 'three';

import { Canvas, useFrame, useThree } from '@/lib/r3f';
import {
  Body,
  Planet,
  bodies,
  dwarfPlanets,
  isPlanet,
  sunBody,
} from '@/constants/planets';
import { pickNearest } from '@/lib/pick';
import { captureGL } from '@/lib/captureGL';
import { ArcSlot, arcLayout, arcPoint, arcSpeed } from './arcLayout';
import { color, space, type } from '@/constants/theme';
import {
  kindIndex,
  placeholder,
  srgb,
  surfaceUniforms,
  useBake,
} from '@/components/solar/bodies';
import {
  blobShader,
  cardboardShader,
  flatToonShader,
  paperShader,
  papierShader,
  ringToonShader,
  yarnShader,
} from './shaders';

const isWeb = Platform.OS === 'web';
/** Kugel-Unterteilung: bei Bastelgröße reicht weniger, die Umrisse bleiben rund */
const SEG: [number, number] = isWeb ? [40, 28] : [32, 22];

/* ---------- Anordnung ---------- */

type Slot = {
  x: number;
  y: number;
  z: number;
  /** Radius in der Szene (Bastelgröße mal Maßstab) */
  r: number;
  /** Maßstab der Kugel: Bei den Bögen werden alle kleiner, wenn es eng wird */
  k: number;
  /** Nur bei Bögen: auf welchem Bogen die Perle sitzt */
  arc?: ArcSlot['arc'];
};
type Layout = {
  W: number;
  H: number;
  D: number;
  /** Bei Bögen hochkant sitzt die Sonne an der linken Wand */
  sun: { x: number; r: number; side: boolean };
  slots: Record<string, Slot>;
  /** Bogenrahmen zum Einordnen beim Umhängen */
  arcs?: { cx: number; cy: number; RX: number; RY: number };
};

/** Aufbau des Kastens: Perlen auf Bögen um die Sonne oder Kugeln an Fäden */
export type BoxStyle = 'arcs' | 'threads';
/** Material: Strick und Stoff oder Papier und Pappe */
export type BoxMaterial = 'knit' | 'paper';

/** Größen im Bastel-Maßstab: Reihenfolge stimmt, Verhältnisse nicht */
const R: Record<string, number> = {
  merkur: 0.3,
  venus: 0.46,
  erde: 0.48,
  mars: 0.38,
  jupiter: 0.9,
  saturn: 0.64,
  uranus: 0.56,
  neptun: 0.54,
  ceres: 0.2,
  pluto: 0.24,
};

/**
 * Wie breit ein Planet samt Monden bzw. Ring wirkt (halbe Breite). Damit
 * bekommt Jupiter mit seinen vier Monden mehr Platz als Merkur, egal an
 * welchem Faden er hängt.
 */
function halfWidth(id: string) {
  const r = R[id] ?? 0.4;
  const moons = MOONS[id] ?? [];
  if (moons.length) {
    const biggest = Math.max(...moons.map((m) => m.size));
    return r + 0.22 + Math.floor((moons.length - 1) / 2) * 0.3 + r * biggest;
  }
  return id === 'saturn' ? r * 1.95 : r;
}

/**
 * Mitten von links nach rechts zwischen x0 und x1: Mischung aus gleichmäßig
 * und nach Breite. `k` = wie stark die Breite zählt (0 = gleichmäßig).
 */
function spread(ids: string[], x0: number, x1: number, k = 0.3) {
  if (ids.length === 1) return [(x0 + x1) / 2];
  const hw = ids.map(halfWidth);
  const raw: number[] = [];
  let acc = 0;
  hw.forEach((w, i) => {
    raw.push(acc + w);
    acc += 2 * w;
  });
  const a = raw[0];
  const b = raw[raw.length - 1];
  return raw.map((c, i) => {
    const even = x0 + ((x1 - x0) * i) / (ids.length - 1);
    const weighted = x0 + ((c - a) / Math.max(b - a, 1e-6)) * (x1 - x0);
    return even * (1 - k) + weighted * k;
  });
}

/** Höhe und Tiefe je Faden-Platz, versetzt wie von Hand aufgehängt */
const LANDSCAPE = {
  y: [0.7, 1.7, 0.45, 1.85, 0.95, 1.15, 1.8, 0.45, 1.5, 0.8],
  z: [0.4, -0.6, 0.5, -0.4, 0.6, 0.2, -0.5, 0.5, -0.3, 0.45],
};
const PORTRAIT = {
  rows: [
    { from: 0, to: 4, x0: -2.3, x1: 2.3, top: 3.6 },
    { from: 4, to: 7, x0: -2.35, x1: 1.85, top: 2.45 },
    { from: 7, to: 10, x0: -2.0, x1: 2.25, top: 0.9 },
  ],
  y: [3.1, 2.5, 3.0, 2.3, 1.3, 0.4, 0.8, -1.6, -1.3, -0.9],
  z: [0.5, -0.6, 0.4, -0.5, 0.5, -0.3, 0.5, 0.4, -0.5, 0.5],
};

/**
 * Anordnung für ein Seitenverhältnis und eine Reihenfolge. Die Plätze gehören
 * zur Reihenfolge, nicht zum Planeten: Wer umsortiert, tauscht die Fäden.
 * Große Kugeln hängen etwas tiefer, damit sie nicht an die Decke stoßen.
 */
export function layoutFor(
  aspect: number,
  order: string[],
  style: BoxStyle = 'threads'
): Layout {
  if (style === 'arcs') return arcsLayoutFor(aspect, order);
  const slots: Record<string, Slot> = {};
  const place = (id: string, x: number, y: number, z: number, top: number) => {
    const r = R[id] ?? 0.4;
    slots[id] = { x, y: Math.min(y, top - r), z, r, k: 1 };
  };
  if (aspect < 0.9) {
    // Hochkant: drei Reihen untereinander
    for (const row of PORTRAIT.rows) {
      const ids = order.slice(row.from, row.to);
      // Enge Reihen: Breite zählt mehr, sonst hängt Jupiters Mobile in Saturns Ring
      spread(ids, row.x0, row.x1, 0.6).forEach((x, j) => {
        const i = row.from + j;
        place(ids[j], x, PORTRAIT.y[i], PORTRAIT.z[i], row.top);
      });
    }
    return { W: 6.4, H: 10, D: 4.4, sun: { x: 0, r: 1.7, side: false }, slots };
  }
  // Quer: eine Reihe, Höhen versetzt
  const n = LANDSCAPE.y.length;
  spread(order, -4.95, 5.05).forEach((x, i) => {
    place(order[i], x, LANDSCAPE.y[i % n], LANDSCAPE.z[i % n], 2.45);
  });
  return { W: 11.6, H: 6.6, D: 4.4, sun: { x: 0, r: 1.7, side: false }, slots };
}

/** Tiefe der Bogen-Ebene: durch die Mitte der Sonne */
const ARC_Z = -4.4 * 0.15;

const arcCache = new Map<string, Layout>();

/** Bögen um die Sonne: quer Sonne unten, hochkant Sonne an der linken Wand */
function arcsLayoutFor(aspect: number, order: string[]): Layout {
  const portrait = aspect < 0.9;
  const key = `${portrait ? 'h' : 'q'}:${order.join(',')}`;
  const hit = arcCache.get(key);
  if (hit) return { ...hit, slots: { ...hit.slots } };
  const W = portrait ? 6.4 : 11.6;
  const H = portrait ? 10 : 6.6;
  const sunR = 1.7;
  const res = arcLayout(
    order.map((id) => ({
      id,
      r: R[id] ?? 0.4,
      moon: Math.max(0, ...(MOONS[id] ?? []).map((m) => m.size)),
      ring: id === 'saturn',
    })),
    { W, H, sunR, side: portrait }
  );
  const slots: Record<string, Slot> = {};
  for (const id of order) {
    const a = res.slots[id];
    slots[id] = { x: a.x, y: a.y, z: ARC_Z, r: (R[id] ?? 0.4) * a.k, k: a.k, arc: a.arc };
  }
  const layout: Layout = {
    W,
    H,
    D: 4.4,
    sun: { x: portrait ? -W / 2 : 0, r: sunR, side: portrait },
    slots,
    arcs: { cx: res.cx, cy: res.cy, RX: res.RX, RY: res.RY },
  };
  arcCache.set(key, layout);
  return { ...layout, slots: { ...slots } };
}

/* ---------- Zustand außerhalb von React ---------- */

type Pendulum = {
  ax: number;
  az: number;
  vx: number;
  vz: number;
  spin: number;
  spinV: number;
  phase: number;
};

/** Licht im Schaukasten: alles, nur die Planeten oder nur die Sonne */
export type LampMode = 'all' | 'planets' | 'sun';

/** Planeten in ihrer echten Reihenfolge, so hängt der Kasten ab Werk */
/** Alles, was im Kasten hängt: Planeten und Zwergplaneten, nach Abstand zur Sonne */
const BOX_BODIES: Planet[] = [...bodies.filter(isPlanet), ...dwarfPlanets].sort(
  (a, b) => a.facts.distanceMioKm - b.facts.distanceMioKm
);
export const BOX_IDS = BOX_BODIES.map((b) => b.id);
const boxName = (id: string) => BOX_BODIES.find((b) => b.id === id)?.name ?? id;

export function createBoxController() {
  const c = {
    aspect: 1,
    order: [...BOX_IDS],
    // Ab Werk das bisherige Design; Bögen und Strick sind zum Dazuwählen
    style: 'threads' as BoxStyle,
    material: 'paper' as BoxMaterial,
    layout: layoutFor(1, BOX_IDS, 'threads'),
    /** Zählt hoch, wenn sich die Anordnung ändert (Bögen neu bauen) */
    layoutVersion: 0,
    /** Aktuelle Aufhängung je Planet, gleitet beim Umsortieren zum neuen Platz */
    cur: {} as Record<string, { x: number; y: number; z: number; k: number }>,
    /** Stop-Motion: Bilder pro Sekunde für die Bewegung (0 = flüssig) */
    stepFps: 0,
    /** Uhr der Szene, läuft in Stop-Motion-Schritten, nur vorwärts */
    simT: 0,
    stepAcc: 0,
    stepIndex: 0,
    /** Bildnummer fürs Boiling der Materialien (ändert sich je Stop-Motion-Bild) */
    boil: 0,
    /** Vom Canvas gesetzt: ein Bild anfordern (Strick rendert nur bei Bedarf) */
    invalidate: () => {},
    /** Bis wann gerade etwas flüssig läuft (Kameraflug, Überblendung); dann jedes Bild rendern */
    busyUntil: 0,
    /** Jemand will gerade flüssige Bilder */
    keepBusy() {
      c.busyUntil = Date.now() + 60;
    },
    /** Je Kugel: Kippeln und Umriss-Zittern pro Stop-Motion-Bild */
    wobble: {} as Record<string, { rot: number; outline: number }>,
    /** Beim Umhängen: über welchem Bogen der Finger gerade ist */
    hoverIndex: -1,
    /** Bastelfarbe je Planet (null = Original) */
    paint: {} as Record<string, string | null>,
    /** Bastelmodus: Ziehen sortiert um, Antippen wählt zum Bemalen */
    editing: false,
    /** Bild der Szene in der Grundansicht, vom Canvas gesetzt */
    snapshot: null as null | (() => Promise<string | null>),
    /** Letzte Schilder-Positionen in Bildschirm-Pixeln: x, y, Skalierung je Planet */
    lastLabels: [] as number[],
    pendulums: {} as Record<string, Pendulum>,
    positions: {} as Record<string, THREE.Vector3>,
    camera: null as THREE.PerspectiveCamera | null,
    size: { width: 1, height: 1 },
    idle: true,
    selectedId: null as string | null,
    /** Sonne unten als Lampe: alles / nur Planeten / nur Sonne */
    lampMode: 'all' as LampMode,
    /** Doppeltipp-Zoom: Ziel-Planet, Fortschritt 0–1 und Grundansicht */
    zoomId: null as string | null,
    zoomT: 0,
    lastZoomId: null as string | null,
    base: { pos: new THREE.Vector3(0, 0, 20), target: new THREE.Vector3() },
    lastTap: { id: null as string | null, t: 0 },
    /** true, wenn das ein Doppeltipp war (dann Zoom umschalten) */
    tap(id: string | null) {
      const now = Date.now();
      const double = now - c.lastTap.t < 320 && c.lastTap.id === id;
      c.lastTap = { id, t: double ? 0 : now };
      if (!double) return false;
      c.zoomId = id && c.zoomId !== id ? id : null;
      return true;
    },
    init(layout: Layout, aspect: number) {
      c.layout = layout;
      c.aspect = aspect;
      // Neue Szene, neue Schilder: beim ersten Bild auf jeden Fall weitergeben
      c.lastLabels = [];
      let i = 0;
      for (const id of Object.keys(layout.slots)) {
        c.pendulums[id] = c.pendulums[id] ?? {
          ax: 0,
          az: 0,
          vx: 0,
          vz: 0,
          spin: i * 1.3,
          spinV: 0,
          phase: i * 1.7,
        };
        c.positions[id] = c.positions[id] ?? new THREE.Vector3();
        const s = layout.slots[id];
        c.positions[id].set(s.x, s.y, s.z);
        c.cur[id] = { x: s.x, y: s.y, z: s.z, k: s.k };
        c.wobble[id] = c.wobble[id] ?? { rot: 0, outline: 0 };
        c.pivots[id] = new THREE.Vector3(s.x, layout.H / 2, s.z);
        i++;
      }
      c.layoutVersion++;
    },
    /** Aufbau wechseln: Anordnung neu, Pendel beruhigt */
    setLook(style: BoxStyle, material: BoxMaterial) {
      const restyle = style !== c.style;
      c.style = style;
      c.material = material;
      c.stepFps = material === 'knit' ? 12 : 0;
      if (!restyle) return;
      for (const id in c.pendulums) {
        const p = c.pendulums[id];
        p.ax = p.az = p.vx = p.vz = 0;
      }
      const next = layoutFor(c.aspect, c.order, style);
      c.layout.sun = next.sun;
      c.layout.arcs = next.arcs;
      Object.assign(c.layout.slots, next.slots);
      c.layoutVersion++;
    },
    /** Neue Reihenfolge: die Fäden gleiten in Rig zu ihren neuen Plätzen */
    setOrder(order: string[]) {
      c.order = [...order];
      const next = layoutFor(c.aspect, c.order, c.style);
      // Gleiches Objekt behalten, Bausteine halten eine Referenz darauf
      c.layout.arcs = next.arcs;
      Object.assign(c.layout.slots, next.slots);
      c.layoutVersion++;
    },
    /** Bildschirmpunkt auf die Ebene der Bögen projizieren */
    toPlane(x: number, y: number) {
      const cam = c.camera;
      if (!cam) return null;
      const ndc = new THREE.Vector2((x / c.size.width) * 2 - 1, 1 - (y / c.size.height) * 2);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, cam);
      const hit = new THREE.Vector3();
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -ARC_Z);
      return ray.ray.intersectPlane(plane, hit) ? hit : null;
    },
    /** Länge des Fadens von der Decke bis zur Kugelmitte */
    threadLength(id: string) {
      return Math.max(0.8, c.layout.H / 2 - (c.cur[id]?.y ?? c.layout.slots[id].y));
    },
    /** Welcher Platz in der Reihenfolge liegt dem Punkt auf dem Bildschirm am nächsten */
    dropIndex(x: number, y: number) {
      const cam = c.camera;
      if (!cam) return -1;
      const frameA = c.layout.arcs;
      if (c.style === 'arcs' && frameA) {
        // Bögen: der Bogen, dessen Radius dem Finger am nächsten ist
        const hit = c.toPlane(x, y);
        if (!hit) return -1;
        const rho = Math.hypot((hit.x - frameA.cx) / frameA.RX, (hit.y - frameA.cy) / frameA.RY);
        let bestI = -1;
        let bestS = Infinity;
        c.order.forEach((id, i) => {
          const d = Math.abs((c.layout.slots[id].arc?.s ?? 0) - rho);
          if (d < bestS) {
            bestS = d;
            bestI = i;
          }
        });
        return bestI;
      }
      const v = new THREE.Vector3();
      let best = -1;
      let bestD = Infinity;
      c.order.forEach((id, i) => {
        const s = c.layout.slots[id];
        v.set(s.x, s.y, s.z).project(cam);
        const sx = ((v.x + 1) / 2) * c.size.width;
        const sy = ((1 - v.y) / 2) * c.size.height;
        // Waagerecht zählt mehr: so sortiert man in einer Reihe
        const d = (sx - x) ** 2 + ((sy - y) * 0.5) ** 2;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    },
    pivots: {} as Record<string, THREE.Vector3>,
    /** Aufhängepunkt an der Decke (pro Layout einmal berechnet) */
    pivot(id: string) {
      return c.pivots[id];
    },
    /** Ziehen: der gegriffene Planet folgt dem Finger, die Physik pausiert für ihn */
    drag: null as null | {
      id: string;
      L: number;
      pxPerUnit: number;
      x0: number;
      z0: number;
      last: { ax: number; az: number; t: number };
      vel: { ax: number; az: number };
      /** Bögen: Weg entlang des Bogens beim Greifen */
      off0: number;
    },
    startDrag(id: string) {
      const cam = c.camera;
      const p = c.pendulums[id];
      if (!cam || !p) return;
      const L = c.threadLength(id);
      const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
      const pxPerUnit =
        c.size.height /
        2 /
        (c.positions[id].distanceTo(cam.position) * tanHalf);
      c.drag = {
        id,
        L,
        pxPerUnit,
        x0: L * Math.sin(p.ax),
        z0: L * Math.sin(p.az),
        last: { ax: p.ax, az: p.az, t: Date.now() },
        vel: { ax: 0, az: 0 },
        off0: p.ax,
      };
      p.vx = 0;
      p.vz = 0;
    },
    moveDrag(dxPx: number, dyPx: number) {
      const d = c.drag;
      if (!d) return;
      const p = c.pendulums[d.id];
      const arc = c.layout.slots[d.id].arc;
      if (c.style === 'arcs' && arc) {
        // Perle rutscht am Draht: nur der Anteil der Bewegung entlang des Bogens zählt
        const th = arc.theta;
        const tx = -arc.rx * Math.sin(th);
        const ty = arc.ry * Math.cos(th);
        const len = Math.hypot(tx, ty) || 1;
        const along = (dxPx * tx - dyPx * ty) / len / d.pxPerUnit;
        p.ax = Math.max(-2.5, Math.min(2.5, d.off0 + along));
        d.last = { ax: p.ax, az: 0, t: Date.now() };
        return;
      }
      const lim = d.L * 0.62;
      const x = Math.max(-lim, Math.min(lim, d.x0 + dxPx / d.pxPerUnit));
      // Nach oben ziehen schiebt nach hinten, nach unten nach vorne
      const z = Math.max(
        -lim * 0.6,
        Math.min(lim * 0.6, d.z0 + (dyPx / d.pxPerUnit) * 0.6)
      );
      p.ax = Math.asin(x / d.L);
      p.az = Math.asin(z / d.L);
      const now = Date.now();
      const dt = Math.max(1, now - d.last.t) / 1000;
      // Geglättete Winkelgeschwindigkeit für den Schwung beim Loslassen
      d.vel.ax = d.vel.ax * 0.6 + ((p.ax - d.last.ax) / dt) * 0.4;
      d.vel.az = d.vel.az * 0.6 + ((p.az - d.last.az) / dt) * 0.4;
      d.last = { ax: p.ax, az: p.az, t: now };
    },
    endDrag() {
      const d = c.drag;
      if (!d) return;
      const p = c.pendulums[d.id];
      if (c.style === 'arcs') {
        // Loslassen: die Perle federt zurück in ihren Spielraum
        p.vx = 0;
        p.spinV += 0.8;
        c.drag = null;
        return;
      }
      // Wer den Finger stillhält, bevor er loslässt, gibt keinen Schwung mit
      const still = Date.now() - d.last.t > 120;
      p.vx = still ? 0 : Math.max(-4, Math.min(4, d.vel.ax));
      p.vz = still ? 0 : Math.max(-3, Math.min(3, d.vel.az));
      p.spinV += Math.abs(p.vx) * 0.6;
      c.drag = null;
    },
    /** Wischen: alle schwingen in die Richtung */
    push(vx: number, vy: number) {
      for (const id in c.pendulums) {
        const p = c.pendulums[id];
        if (c.style === 'arcs') {
          // Perlen rutschen ein Stück, so weit ihr Spielraum reicht
          const sway = c.layout.slots[id]?.arc?.sway ?? 0.1;
          p.vx += vx * sway * (1.6 + Math.random() * 0.8);
          p.spinV += Math.abs(vx) * 1.5;
          continue;
        }
        p.vx += vx * (0.8 + Math.random() * 0.4);
        p.vz += vy * (0.5 + Math.random() * 0.3);
        p.spinV += Math.abs(vx) * 1.5;
      }
    },
    /** Körper unter dem Finger, großzügig */
    pick(x: number, y: number): Body | null {
      if (!c.camera) return null;
      const { sun, W, H, D } = c.layout;
      return pickNearest<Body>(c.camera, c.size, x, y, [
        ...BOX_BODIES.map((b) => ({
          item: b as Body,
          position: c.positions[b.id],
          radius: c.layout.slots[b.id].r,
          reach: (r: number) => r + 16,
        })),
        {
          item: sunBody,
          position: sun.side
            ? new THREE.Vector3(-W / 2 + sun.r * 0.5, 0, -D * 0.15)
            : new THREE.Vector3(sun.x, -H / 2 + sun.r * 0.5, -D * 0.15),
          radius: sun.r,
          reach: (r: number) => r,
          penalty: 1e4,
        },
      ]);
    },
  };
  return c;
}

export type BoxController = ReturnType<typeof createBoxController>;

/* ---------- Bausteine ---------- */

/** Fester Pseudo-Zufall 0–1 je Zahl: gleiche Bildnummer, gleiches Wackeln */
function hash1(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Licht kommt von der Sonne unten in der Box — sie ist die Lampe. */
function lamp(layout: Layout) {
  const { sun, W, H, D } = layout;
  if (sun.side) return new THREE.Vector3(-W / 2 + sun.r * 0.55, 0, -D * 0.15);
  return new THREE.Vector3(sun.x, -H / 2 + sun.r * 0.55, -D * 0.15);
}

function sunLit(mode: LampMode) {
  return mode === 'all' || mode === 'sun';
}

function planetsLit(mode: LampMode) {
  return mode === 'all' || mode === 'planets';
}

function useShader(
  def: { vertex: string; fragment: string },
  uniforms: Record<string, THREE.IUniform>,
  extra?: Partial<THREE.ShaderMaterialParameters>
) {
  const m = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: def.vertex,
        fragmentShader: def.fragment,
        uniforms,
        ...extra,
      }),
    // Uniforms gelten ab dem ersten Aufruf, spätere Werte werden ignoriert
    []
  );
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

function PaperFace({
  w,
  h,
  position,
  rotation,
  tint,
  seed,
  layout,
  controller,
}: {
  w: number;
  h: number;
  position: [number, number, number];
  rotation: [number, number, number];
  tint: string;
  seed: number;
  layout: Layout;
  controller: BoxController;
}) {
  const material = useShader(paperShader, {
    uColor: { value: srgb(tint) },
    uStar: { value: srgb('#F2C94C') },
    uCells: {
      value: new THREE.Vector2(
        Math.max(2, Math.round(w / 0.85)),
        Math.max(2, Math.round(h / 0.85))
      ),
    },
    uSeed: { value: seed },
    uLamp: { value: lamp(layout) },
    uBright: { value: 1 },
    uKnit: { value: 0 },
    uBoil: { value: 0 },
  });
  useFrame(() => {
    // Wände hell, wenn die Sonne brennt
    material.uniforms.uBright.value = sunLit(controller.lampMode) ? 1 : 0;
    material.uniforms.uKnit.value = controller.material === 'knit' ? 1 : 0;
    material.uniforms.uBoil.value = controller.boil;
  });
  return (
    <mesh position={position} rotation={rotation} material={material}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

function BoxShell({
  layout,
  controller,
}: {
  layout: Layout;
  controller: BoxController;
}) {
  const { W, H, D } = layout;
  const t = 0.22;
  const card = useShader(cardboardShader, {
    uColor: { value: srgb('#B8895A') },
    uLamp: { value: lamp(layout) },
    uBright: { value: 1 },
  });
  const z = D / 2 + t / 2;
  useFrame(() => {
    card.uniforms.uBright.value = sunLit(controller.lampMode) ? 1 : 0;
  });
  return (
    <group>
      <PaperFace
        w={W}
        h={H}
        position={[0, 0, -D / 2]}
        rotation={[0, 0, 0]}
        tint="#1E2A6B"
        seed={1}
        layout={layout}
        controller={controller}
      />
      <PaperFace
        w={W}
        h={D}
        position={[0, -H / 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        tint="#1A2460"
        seed={2}
        layout={layout}
        controller={controller}
      />
      <PaperFace
        w={W}
        h={D}
        position={[0, H / 2, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        tint="#162055"
        seed={3}
        layout={layout}
        controller={controller}
      />
      <PaperFace
        w={D}
        h={H}
        position={[-W / 2, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        tint="#1B2664"
        seed={4}
        layout={layout}
        controller={controller}
      />
      <PaperFace
        w={D}
        h={H}
        position={[W / 2, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        tint="#1B2664"
        seed={5}
        layout={layout}
        controller={controller}
      />
      {/* Kartonrand vorne */}
      <mesh position={[0, H / 2 + t / 2, z]} material={card}>
        <boxGeometry args={[W + 2 * t, t, t * 1.6]} />
      </mesh>
      <mesh position={[0, -H / 2 - t / 2, z]} material={card}>
        <boxGeometry args={[W + 2 * t, t, t * 1.6]} />
      </mesh>
      <mesh position={[-W / 2 - t / 2, 0, z]} material={card}>
        <boxGeometry args={[t, H, t * 1.6]} />
      </mesh>
      <mesh position={[W / 2 + t / 2, 0, z]} material={card}>
        <boxGeometry args={[t, H, t * 1.6]} />
      </mesh>
    </group>
  );
}

function bakeJobFor(body: Body, material: THREE.ShaderMaterial) {
  if (!isPlanet(body)) {
    // Die Sonne braucht keine Farb-Parameter, KIND 3 rechnet sie selbst
    const none = {
      kind: 'rocky' as const,
      colors: ['#000000', '#000000', '#000000'] as [string, string, string],
      rim: '#000000',
    };
    return {
      material,
      key: 'sonne',
      defines: { KIND: 3 },
      uniforms: () => surfaceUniforms(none, 0),
    };
  }
  const sf = body.scene.surface;
  return {
    material,
    key: body.id,
    defines: {
      KIND: kindIndex[sf.kind],
      ...(sf.spot ? { HAS_SPOT: '' } : {}),
      ...(sf.polarCaps ? { HAS_CAPS: '' } : {}),
    },
    uniforms: () =>
      surfaceUniforms(sf, body.id.length * 1.37 + body.scene.orbitRadius),
  };
}

const outlineMaterial = new THREE.MeshBasicMaterial({
  color: '#120E0A',
  side: THREE.BackSide,
});

function SunDome({
  layout,
  controller,
}: {
  layout: Layout;
  controller: BoxController;
}) {
  const { H, D } = layout;
  const { x, r } = layout.sun;
  const material = useShader(papierShader, {
    uMap: { value: placeholder },
    uLamp: { value: lamp(layout) },
    uEmissive: { value: 0.65 },
    uBright: { value: 1 },
    uKnit: { value: 0 },
    uStitch: { value: layout.sun.r },
    uBoil: { value: 0 },
  });
  useBake([bakeJobFor(sunBody, material)]);
  const rayMat = useShader(flatToonShader, {
    uColor: { value: srgb('#F5B544') },
    uLamp: { value: lamp(layout) },
    uBright: { value: 1 },
  });
  const raysGroup = useRef<THREE.Group>(null);
  useFrame(() => {
    const on = sunLit(controller.lampMode);
    material.uniforms.uKnit.value = controller.material === 'knit' ? 1 : 0;
    // Die Sonne bleibt ruhig: kein Boiling, sie ist der feste Punkt im Kasten
    material.uniforms.uEmissive.value = on ? 0.9 : 0.05;
    material.uniforms.uBright.value = on ? 1 : 0.15;
    rayMat.uniforms.uBright.value = on ? 1 : 0;
    if (raysGroup.current) raysGroup.current.visible = on;
  });
  const rays = useMemo(() => {
    const out: { angle: number; len: number }[] = [];
    const n = 9;
    for (let i = 0; i < n; i++)
      out.push({ angle: (Math.PI * (i + 0.5)) / n, len: i % 2 ? 0.62 : 0.85 });
    return out;
  }, []);
  const zc = -D * 0.15;
  // Hochkant bei Bögen: Sonne an der linken Wand, Kuppel zeigt nach rechts
  const side = layout.sun.side;
  return (
    <group
      position={side ? [-layout.W / 2, 0, zc] : [x, -H / 2, zc]}
      rotation={side ? [0, 0, -Math.PI / 2] : [0, 0, 0]}
    >
      <group ref={raysGroup}>
        {rays.map((ray, i) => (
          <mesh
            key={i}
            position={[
              Math.cos(ray.angle) * r * (1 + ray.len * 0.45),
              Math.sin(ray.angle) * r * (1 + ray.len * 0.45),
              -0.15,
            ]}
            rotation={[0, 0, ray.angle - Math.PI / 2]}
            scale={[1, 1, 0.22]}
            material={rayMat}
          >
            <coneGeometry args={[r * 0.2, r * ray.len, 3]} />
          </mesh>
        ))}
      </group>
      <mesh material={material}>
        <sphereGeometry
          args={[r, SEG[0], SEG[1], 0, Math.PI * 2, 0, Math.PI / 2]}
        />
      </mesh>
      <mesh material={outlineMaterial} scale={1.035}>
        <sphereGeometry args={[r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
    </group>
  );
}

function HangingPlanet({
  body,
  controller,
}: {
  body: Body;
  controller: BoxController;
}) {
  // Geometrie in Bastelgröße, der Maßstab der Anordnung kommt als Skalierung dazu
  const slot = { r: R[body.id] ?? 0.4 };
  const group = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const outline = useRef<THREE.Mesh>(null);
  const material = useShader(papierShader, {
    uMap: { value: placeholder },
    uLamp: { value: lamp(controller.layout) },
    uEmissive: { value: 0.45 },
    uBright: { value: 1 },
    uFlat: { value: 0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uTintAmt: { value: 0 },
    uKnit: { value: 0 },
    uStitch: { value: slot.r },
    uBoil: { value: 0 },
  });
  useBake([bakeJobFor(body, material)]);
  const lastPaint = useRef<string | null>(null);
  const rings = isPlanet(body) ? body.scene.rings : undefined;
  const ringMat = useShader(
    ringToonShader,
    {
      uColor: { value: srgb('#D4C49A') },
      uInner: { value: slot.r * 1.3 },
      uOuter: { value: slot.r * 2.1 },
    },
    { transparent: true, side: THREE.DoubleSide, depthWrite: false }
  );
  const tilt = isPlanet(body)
    ? (Math.min(body.scene.tiltDeg, 100) * Math.PI) / 180
    : 0;
  const dir = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const pos = controller.positions[body.id];
    const p = controller.pendulums[body.id];
    if (!group.current || !pos || !p) return;
    group.current.position.copy(pos);
    group.current.scale.setScalar(controller.cur[body.id]?.k ?? 1);
    material.uniforms.uKnit.value = controller.material === 'knit' ? 1 : 0;
    material.uniforms.uBoil.value = controller.boil;
    const wob = controller.wobble[body.id];
    if (outline.current) outline.current.scale.setScalar(1.045 + (wob?.outline ?? 0));
    // Exakt entlang des Fadens ausrichten, damit Stab und Schnüre am Faden sitzen
    dir.copy(controller.pivot(body.id)).sub(pos).normalize();
    group.current.quaternion.setFromUnitVectors(UP, dir);
    if (spinner.current) spinner.current.rotation.y = p.spin;
    // Stop-Motion: leicht angestupst, kippelt pro Bild ein wenig
    if (wob?.rot) group.current.rotateZ(wob.rot);
    // Bastelfarbe weich ein- und ausblenden, wie frisch angemalt
    const paint = controller.paint[body.id] ?? null;
    if (paint && paint !== lastPaint.current) {
      (material.uniforms.uTint.value as THREE.Vector3).copy(srgb(paint));
    }
    lastPaint.current = paint ?? lastPaint.current;
    const amt = material.uniforms.uTintAmt;
    const goal = paint ? 0.85 : 0;
    amt.value += (goal - amt.value) * 0.15;
    if (Math.abs(goal - amt.value) > 0.005) controller.keepBusy();
    const mode = controller.lampMode;
    // Sonne an → von unten beleuchtet; Planeten-Modus → Eigenleuchten
    material.uniforms.uBright.value = sunLit(mode) || planetsLit(mode) ? 1 : 0;
    // Sonne aus → kein gerichtetes Licht von unten, Planeten leuchten gleichmäßig
    material.uniforms.uFlat.value = sunLit(mode) ? 0 : 1;
    material.uniforms.uEmissive.value = planetsLit(mode)
      ? mode === 'planets'
        ? 0.7
        : 0.45
      : 0;
  });

  return (
    <group ref={group}>
      <MoonMobile
        planetId={body.id}
        radius={slot.r}
        layout={controller.layout}
        controller={controller}
      />
      <MoonOrbit planetId={body.id} radius={slot.r} controller={controller} />
      <group rotation={[0, 0, tilt * 0.35]}>
        <group ref={spinner}>
          <mesh material={material}>
            <sphereGeometry args={[slot.r, SEG[0], SEG[1]]} />
          </mesh>
          <mesh ref={outline} material={outlineMaterial} scale={1.045}>
            <sphereGeometry args={[slot.r, 28, 20]} />
          </mesh>
        </group>
        {rings && (
          <mesh
            rotation={[-Math.PI / 2 + 0.55, 0.15, 0]}
            material={ringMat}
            renderOrder={1}
          >
            <ringGeometry
              args={[slot.r * 1.3, slot.r * 2.1, isWeb ? 96 : 64, 1]}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

/**
 * Die bekanntesten Monde je Planet, Größen im Bastel-Maßstab (Anteil am Planetenradius).
 * Auswahl: die bekanntesten Monde, Größen und Abstände im Bastel-Maßstab.
 */
type MoonDef = { name: string; color: string; size: number };
const MOONS: Record<string, MoonDef[]> = {
  erde: [{ name: 'Mond', color: '#BDB8AE', size: 0.27 }],
  mars: [
    { name: 'Phobos', color: '#7B6A5C', size: 0.16 },
    { name: 'Deimos', color: '#8E7D6C', size: 0.13 },
  ],
  jupiter: [
    { name: 'Io', color: '#E3C552', size: 0.11 },
    { name: 'Europa', color: '#D8CDB4', size: 0.1 },
    { name: 'Ganymed', color: '#9A8D7D', size: 0.14 },
    { name: 'Kallisto', color: '#6C6157', size: 0.13 },
  ],
  saturn: [{ name: 'Titan', color: '#D9A44A', size: 0.17 }],
  uranus: [
    { name: 'Titania', color: '#A8A39C', size: 0.13 },
    { name: 'Oberon', color: '#8F877F', size: 0.12 },
  ],
  neptun: [{ name: 'Triton', color: '#E2CFC8', size: 0.17 }],
  // Charon ist halb so groß wie Pluto, im Bastel-Maßstab etwas kleiner
  pluto: [{ name: 'Charon', color: '#9E978E', size: 0.42 }],
};

const WIRE = '#D8CFBD';
const UP = new THREE.Vector3(0, 1, 0);

/** Höhe des Holzstabs über der Planetenmitte, entlang des Fadens */
function stickHeight(r: number) {
  return r + 0.32;
}

/** Wo der Faden über dem Planeten das Namensschild trägt (über dem Stab, falls vorhanden) */
function tagHeight(id: string, r: number) {
  // Extra Abstand, damit das hängende Papier die Kugel nicht verdeckt
  return (MOONS[id]?.length ? stickHeight(r) : r) + 1.05;
}

/**
 * Mobile über dem Planeten: ein Holzstäbchen quer am Hauptfaden, die Monde
 * baumeln an eigenen Schnüren links und rechts neben dem Planeten.
 */
function MoonMobile({
  planetId,
  radius,
  layout,
  controller,
}: {
  planetId: string;
  radius: number;
  layout: Layout;
  controller: BoxController;
}) {
  const moons = MOONS[planetId] ?? [];
  const y = stickHeight(radius);

  // Monde abwechselnd links und rechts, nach außen hin weiter weg
  const hangs = useMemo(
    () =>
      moons.map((m, i) => {
        const side = i % 2 === 0 ? 1 : -1;
        const step = Math.floor(i / 2);
        const x = side * (radius + 0.22 + step * 0.3);
        const r = radius * m.size;
        const bottom = -radius * (0.15 + (0.35 * ((i * 7) % 3)) / 2);
        return { ...m, x, r, cy: bottom };
      }),
    [moons, radius]
  );
  const half = hangs.length
    ? Math.max(...hangs.map((h) => Math.abs(h.x))) + 0.08
    : 0;

  const { strings, moonMats, woodMat } = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    hangs.forEach((h) =>
      pts.push(
        new THREE.Vector3(h.x, y, 0),
        new THREE.Vector3(h.x, h.cy + h.r, 0)
      )
    );
    const line = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({
        color: WIRE,
        transparent: true,
        opacity: 0.85,
      })
    );
    line.frustumCulled = false;
    return {
      strings: line,
      woodMat: new THREE.ShaderMaterial({
        vertexShader: flatToonShader.vertex,
        fragmentShader: flatToonShader.fragment,
        uniforms: {
          uColor: { value: srgb('#A97C50') },
          uLamp: { value: lamp(layout) },
          uBright: { value: 1 },
          uFlat: { value: 0 },
        },
      }),
      moonMats: hangs.map(
        (h) =>
          new THREE.ShaderMaterial({
            vertexShader: flatToonShader.vertex,
            fragmentShader: flatToonShader.fragment,
            uniforms: {
              uColor: { value: srgb(h.color) },
              uLamp: { value: lamp(layout) },
              uBright: { value: 1 },
              uFlat: { value: 0 },
            },
          })
      ),
    };
  }, [hangs, y, layout]);

  useEffect(
    () => () => {
      strings.geometry.dispose();
      (strings.material as THREE.Material).dispose();
      woodMat.dispose();
      moonMats.forEach((m) => m.dispose());
    },
    [strings, woodMat, moonMats]
  );

  const mobile = useRef<THREE.Group>(null);
  useFrame(() => {
    // Holzstab-Mobile nur bei Fäden; bei Bögen kreisen die Monde (MoonOrbit)
    if (mobile.current) mobile.current.visible = controller.style === 'threads';
    const mode = controller.lampMode;
    const b = sunLit(mode) || planetsLit(mode) ? 1 : 0;
    const flat = sunLit(mode) ? 0 : 1;
    woodMat.uniforms.uBright.value = b;
    woodMat.uniforms.uFlat.value = flat;
    moonMats.forEach((m) => {
      m.uniforms.uBright.value = b;
      m.uniforms.uFlat.value = flat;
    });
  });

  if (!hangs.length) return null;
  return (
    <group ref={mobile}>
      <primitive object={strings} />
      <mesh
        position={[0, y, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={woodMat}
      >
        <cylinderGeometry args={[0.022, 0.022, half * 2, 8]} />
      </mesh>
      {hangs.map((h, i) => (
        <group key={h.name} position={[h.x, h.cy, 0]}>
          <mesh material={moonMats[i]}>
            <sphereGeometry args={[h.r, 18, 12]} />
          </mesh>
          <mesh material={outlineMaterial} scale={1.08}>
            <sphereGeometry args={[h.r, 12, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Bögen: Die Monde kreisen eng um ihren Planeten, auf einer leicht geneigten
 * Bahn, sodass sie mal vor, mal hinter der Kugel vorbeiziehen. Die Bahn bleibt
 * innerhalb des Platzes, den arcLayout für Planet samt Monden reserviert.
 */
function MoonOrbit({
  planetId,
  radius,
  controller,
}: {
  planetId: string;
  radius: number;
  controller: BoxController;
}) {
  const moons = MOONS[planetId] ?? [];
  const group = useRef<THREE.Group>(null);
  const refs = useRef<(THREE.Group | null)[]>([]);
  const mats = useMemo(
    () =>
      moons.map(
        (m) =>
          new THREE.ShaderMaterial({
            vertexShader: flatToonShader.vertex,
            fragmentShader: flatToonShader.fragment,
            uniforms: {
              uColor: { value: srgb(m.color) },
              uLamp: { value: lamp(controller.layout) },
              uBright: { value: 1 },
              uFlat: { value: 0 },
            },
          })
      ),
    [moons, controller.layout]
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  useFrame(() => {
    if (!group.current) return;
    const on = controller.style === 'arcs';
    group.current.visible = on;
    if (!on) return;
    const t = controller.simT;
    const mode = controller.lampMode;
    const b = sunLit(mode) || planetsLit(mode) ? 1 : 0;
    moons.forEach((m, i) => {
      const g = refs.current[i];
      if (!g) return;
      const mr = radius * m.size;
      const d = radius + 0.08 + mr;
      // Innere Monde schneller, Startwinkel verteilt
      const a = (i / moons.length) * Math.PI * 2 + t * (0.5 / (1 + i * 0.35));
      g.position.set(Math.cos(a) * d, Math.sin(a) * d * 0.28, Math.sin(a) * d);
      mats[i].uniforms.uBright.value = b;
      mats[i].uniforms.uFlat.value = sunLit(mode) ? 0 : 1;
    });
  });
  if (!moons.length) return null;
  return (
    <group ref={group}>
      {moons.map((m, i) => (
        <group
          key={m.name}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <mesh material={mats[i]}>
            <sphereGeometry args={[radius * m.size, 18, 12]} />
          </mesh>
          <mesh material={outlineMaterial} scale={1.08}>
            <sphereGeometry args={[radius * m.size, 12, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Bögen: halbe Ellipsen aus Draht bzw. Garn, eine je Platz in der Reihenfolge.
 * Beim Umhängen leuchtet der Bogen auf, über dem der Finger gerade ist.
 */
function Arcs({ controller }: { controller: BoxController }) {
  const [version, setVersion] = useState(controller.layoutVersion);
  const group = useRef<THREE.Group>(null);
  const tubes = useMemo(() => {
    if (controller.style !== 'arcs') return [];
    return controller.order.map((id) => {
      const a = controller.layout.slots[id]?.arc;
      if (!a) return null;
      const side = controller.layout.sun.side;
      const from = side ? -Math.PI / 2 : 0;
      const to = side ? Math.PI / 2 : Math.PI;
      const curve = new THREE.EllipseCurve(a.cx, a.cy, a.rx, a.ry, from, to, false, 0);
      const pts = curve.getPoints(96).map((p) => new THREE.Vector3(p.x, p.y, ARC_Z - 0.02));
      const path = new THREE.CatmullRomCurve3(pts);
      const geo = new THREE.TubeGeometry(path, 96, 0.035, 5, false);
      const mat = new THREE.ShaderMaterial({
        vertexShader: yarnShader.vertex,
        fragmentShader: yarnShader.fragment,
        uniforms: {
          uColor: { value: srgb('#E6DAC4') },
          uLamp: { value: lamp(controller.layout) },
          uBright: { value: 1 },
          uKnit: { value: 0 },
          uGlow: { value: 0 },
          uLen: { value: path.getLength() },
          uBoil: { value: 0 },
        },
      });
      return { geo, mat };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, controller]);
  useEffect(
    () => () =>
      tubes.forEach((t) => {
        t?.geo.dispose();
        t?.mat.dispose();
      }),
    [tubes]
  );
  useFrame(() => {
    if (controller.layoutVersion !== version) setVersion(controller.layoutVersion);
    const mode = controller.lampMode;
    tubes.forEach((t, i) => {
      if (!t) return;
      t.mat.uniforms.uKnit.value = controller.material === 'knit' ? 1 : 0;
      t.mat.uniforms.uBoil.value = controller.boil;
      t.mat.uniforms.uBright.value = sunLit(mode) || planetsLit(mode) ? 1 : 0.4;
      const target = controller.editing && controller.drag && controller.hoverIndex === i ? 1 : 0;
      const g = t.mat.uniforms.uGlow;
      g.value += (target - g.value) * 0.3;
      if (Math.abs(target - g.value) > 0.01) controller.keepBusy();
    });
  });
  return (
    <group ref={group}>
      {tubes.map((t, i) => t && <mesh key={i} geometry={t.geo} material={t.mat} />)}
    </group>
  );
}

/** Alle Fäden in einem Objekt, Punkte werden pro Bild nachgeführt */
function Threads({ controller }: { controller: BoxController }) {
  const ids = Object.keys(controller.layout.slots);
  const { lines, attr } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const a = new THREE.BufferAttribute(new Float32Array(ids.length * 6), 3);
    a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', a);
    const mat = new THREE.LineBasicMaterial({
      color: '#EDE6D6',
      transparent: true,
      opacity: 0.85,
    });
    const lines = new THREE.LineSegments(geo, mat);
    // Die Fäden sind immer im Bild, deshalb kein Culling (spart das Bounding-Sphere-Update)
    lines.frustumCulled = false;
    return { lines, attr: a };
  }, [controller.layout]);
  useEffect(
    () => () => {
      lines.geometry.dispose();
      (lines.material as THREE.Material).dispose();
    },
    [lines]
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    lines.visible = controller.style === 'threads';
    if (!lines.visible) return;
    ids.forEach((id, i) => {
      const top = controller.pivot(id);
      const pos = controller.positions[id];
      const r = controller.layout.slots[id].r;
      attr.setXYZ(i * 2, top.x, top.y, top.z);
      tmp
        .copy(top)
        .sub(pos)
        .normalize()
        .multiplyScalar(r * 0.98)
        .add(pos);
      attr.setXYZ(i * 2 + 1, tmp.x, tmp.y, tmp.z);
    });
    attr.needsUpdate = true;
  });
  return <primitive object={lines} />;
}

function Blob({ id, controller }: { id: string; controller: BoxController }) {
  const ref = useRef<THREE.Mesh>(null);
  const material = useShader(
    blobShader,
    { uStrength: { value: 0.45 } },
    { transparent: true, depthWrite: false }
  );
  const floor = -controller.layout.H / 2 + 0.01;
  useFrame(() => {
    const pos = controller.positions[id];
    if (!ref.current || !pos) return;
    const h = pos.y - floor;
    const s = controller.layout.slots[id].r * (2.4 + h * 0.18);
    ref.current.position.set(pos.x + h * 0.08, floor, pos.z - h * 0.12);
    ref.current.scale.set(s, s, 1);
    material.uniforms.uStrength.value = 0.5 / (1 + h * 0.18);
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

const STICKER_IDS = BOX_IDS;

/** Kamera einpassen, Pendel rechnen, Schilder-Positionen pro Bild melden */
function Rig({
  controller,
  labelPos,
}: {
  controller: BoxController;
  labelPos: SharedValue<number[]>;
}) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const zoomPos = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const { W, H, D } = controller.layout;
    const aspect = size.width / Math.max(size.height, 1);
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
    const dist =
      Math.max(H / 2 / tanHalf, W / 2 / (tanHalf * aspect)) * 1.1 + D / 2;
    controller.base.pos.set(0, H * 0.05, dist);
    controller.base.target.set(0, -H * 0.02, 0);
    cam.position.copy(controller.base.pos);
    cam.lookAt(controller.base.target);
    // r3f setzt das Seitenverhältnis erst später, die Schilder brauchen es jetzt
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    controller.camera = cam;
    controller.size = { width: size.width, height: size.height };
  }, [camera, size, controller]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    // Stop-Motion: Die Welt rückt nur alle 1/stepFps Sekunden weiter, dann dafür
    // um die ganze Zeit. Zwischendurch steht alles still, wie gebastelt und abfotografiert.
    let simDt = Math.min(rawDt, 0.25);
    if (controller.stepFps > 0) {
      controller.stepAcc += simDt;
      simDt = 0;
      if (controller.stepAcc >= 1 / controller.stepFps) {
        controller.stepIndex++;
        // Manchmal bleibt ein Bild länger stehen; der nächste Schritt holt die Zeit
        // dann nach. Die Uhr läuft dabei nur vorwärts, nie zurück.
        const hold = hash1(controller.stepIndex) < 0.3 && controller.stepAcc < 0.3;
        if (!hold) {
          simDt = Math.min(controller.stepAcc, 0.35);
          controller.stepAcc = 0;
          // Neues Bild: alles ist ein bisschen anders angefasst (Boiling)
          controller.boil = controller.stepIndex;
          let i = 0;
          for (const id in controller.wobble) {
            const w = controller.wobble[id];
            const seed = controller.stepIndex * 31 + i++ * 7;
            // Nur Kippeln und Umriss-Zittern. Kein Versatz der Position: der hätte auf
            // schrägen Bogenstücken einen Anteil gegen die Laufrichtung (sieht nach Zurückspringen aus)
            // Ganz sacht: ±0,4° Kippeln, Umriss bleibt ruhig. Mehr wirkt schnell albern.
            w.rot = (hash1(seed + 1) - 0.5) * 0.014;
            w.outline = 0;
          }
        }
      }
    }
    const arcs = controller.style === 'arcs';
    // Große Schritte in kleine teilen, damit Pendel und Federn stabil bleiben
    const n = simDt > 0 ? Math.ceil(simDt / (1 / 60)) : 0;
    const h = n ? simDt / n : 0;
    for (let k = 0; k < n; k++) {
      controller.simT += h;
      const t = controller.simT;
      // Umsortieren: Aufhängung gleitet zum neuen Platz, der Faden zieht die Kugel mit
      const glide = 1 - Math.exp(-h * 5);
      for (const id in controller.cur) {
        const cur = controller.cur[id];
        const slot = controller.layout.slots[id];
        cur.x += (slot.x - cur.x) * glide;
        cur.y += (slot.y - cur.y) * glide;
        cur.z += (slot.z - cur.z) * glide;
        cur.k += (slot.k - cur.k) * glide;
      }
      for (const id in controller.pendulums) {
        const p = controller.pendulums[id];
        const idle = controller.idle ? 1 : 0;
        if (arcs) {
          // Perle auf dem Draht: wandert langsam hin und her, nie weiter als ihr Spielraum
          const sway = controller.layout.slots[id]?.arc?.sway ?? 0;
          const goal = idle * sway * 0.85 * Math.sin(t * 0.32 + p.phase);
          if (controller.drag?.id !== id) {
            p.vx += (-6 * (p.ax - goal) - 2.4 * p.vx) * h;
            p.ax += p.vx * h;
            if (Math.abs(p.ax) > sway && Math.abs(p.ax) < 2.6) {
              // Nur nach dem Loslassen kurz außerhalb, dann zurück; nie gegen den Nachbarn schieben
              if (!controller.editing && Math.sign(p.vx) === Math.sign(p.ax)) p.vx *= 0.5;
            }
          }
        } else {
          const L = controller.threadLength(id);
          const w2 = 9.8 / L;
          const fx =
            -w2 * Math.sin(p.ax) -
            0.9 * p.vx +
            idle * 0.06 * Math.sin(t * 0.7 + p.phase);
          const fz =
            -w2 * Math.sin(p.az) -
            0.9 * p.vz +
            idle * 0.06 * Math.cos(t * 0.55 + p.phase * 1.3);
          if (controller.drag?.id !== id) {
            p.vx += fx * h;
            p.vz += fz * h;
            p.ax = Math.max(-0.7, Math.min(0.7, p.ax + p.vx * h));
            p.az = Math.max(-0.5, Math.min(0.5, p.az + p.vz * h));
          }
        }
        p.spinV *= Math.exp(-h * 1.2);
        p.spin += (0.18 + p.spinV) * h;
      }
    }
    // Positionen jedes Bild aus dem Zustand: so bleibt Ziehen flüssig, der Rest springt im Takt
    for (const id in controller.pendulums) {
      const p = controller.pendulums[id];
      const cur = controller.cur[id];
      const slot = controller.layout.slots[id];
      if (!cur || !slot) continue;
      if (arcs && slot.arc) {
        const a = slot.arc;
        const th = a.theta + p.ax / arcSpeed(a, a.theta);
        const rest = arcPoint(a, a.theta);
        const at = arcPoint(a, th);
        controller.positions[id].set(cur.x + at.x - rest.x, cur.y + at.y - rest.y, cur.z);
        // Kugel steht aufrecht: "Aufhängung" senkrecht darüber
        controller.pivots[id].set(
          controller.positions[id].x,
          controller.positions[id].y + 10,
          cur.z
        );
      } else {
        controller.pivots[id].set(cur.x, controller.layout.H / 2, cur.z);
        const L = controller.threadLength(id);
        const top = controller.pivots[id];
        controller.positions[id].set(
          top.x + L * Math.sin(p.ax),
          top.y - L * Math.cos(p.ax) * Math.cos(p.az),
          top.z + L * Math.sin(p.az)
        );
      }
    }
    // Kamera: zwischen Grundansicht und Zoom auf den gewählten Planeten
    const cam = controller.camera;
    if (cam) {
      const zoomGoal = controller.zoomId ? 1 : 0;
      controller.zoomT += (zoomGoal - controller.zoomT) * (1 - Math.exp(-dt * 4));
      // Kameraflug läuft flüssig, auch im Strick-Modus
      if (Math.abs(zoomGoal - controller.zoomT) > 0.002) controller.keepBusy();
      const z = controller.zoomT;
      const e = z * z * (3 - 2 * z);
      if (e > 0.001) {
        const id = controller.zoomId ?? controller.lastZoomId;
        const slot = id ? controller.layout.slots[id] : null;
        const tgt = id ? controller.positions[id] : null;
        if (tgt && slot) {
          const r = slot.r;
          const reach = (MOONS[id!]?.length ? r + 0.38 + 0.4 : r) * 3.4 + 1.2;
          zoomPos
            .copy(controller.base.pos)
            .sub(tgt)
            .normalize()
            .multiplyScalar(reach)
            .add(tgt);
          // Bei offener Detailkarte Planet nach oben im Bild schieben
          if (controller.selectedId) zoomPos.y += r * 0.55;
          cam.position.lerpVectors(controller.base.pos, zoomPos, e);
          lookAt.lerpVectors(controller.base.target, tgt, e);
          if (controller.selectedId) lookAt.y -= r * 0.9;
          cam.lookAt(lookAt);
        }
      } else {
        cam.position.copy(controller.base.pos);
        cam.lookAt(controller.base.target);
      }
      if (controller.zoomId) controller.lastZoomId = controller.zoomId;
      cam.updateMatrixWorld();

      // Schilder: Knoten am Hauptfaden über dem Planeten, Größe wächst beim Zoomen mit
      const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
      const out = new Array(STICKER_IDS.length * 3);
      STICKER_IDS.forEach((id, i) => {
        const pos = controller.positions[id];
        const r = controller.layout.slots[id].r;
        v.copy(controller.pivot(id))
          .sub(pos)
          .normalize()
          // Bögen: Oberkante der Kugel (bei Monden über ihrer Bahn)
          .multiplyScalar(arcs ? r * (MOONS[id]?.length ? 1.35 : 1) + 0.06 : tagHeight(id, r))
          .add(pos);
        const pxPerUnit =
          controller.size.height / 2 / (v.distanceTo(cam.position) * tanHalf);
        v.project(cam);
        const k = Math.max(0.85, Math.min(3.2, pxPerUnit / 52));
        out[i * 3] = ((v.x + 1) / 2) * controller.size.width;
        // Bögen: Schild hängt nach unten vom Knoten, also Knoten um Schildhöhe
        // (Knoten + Schnur + Schild, etwa 40 px) über die Kugel heben
        out[i * 3 + 1] = ((1 - v.y) / 2) * controller.size.height - (arcs ? 40 * k : 0);
        out[i * 3 + 2] = k;
      });
      // Nur weitergeben, wenn sich ein Schild sichtbar bewegt hat: jede Zuweisung
      // wandert zum UI-Thread, und in Stop-Motion stehen die Schilder meist still
      const prev = controller.lastLabels;
      let moved = prev.length !== out.length;
      for (let i = 0; !moved && i < out.length; i++) {
        if (Math.abs(out[i] - prev[i]) > (i % 3 === 2 ? 0.002 : 0.25)) moved = true;
      }
      if (moved) {
        labelPos.value = out;
        controller.lastLabels = out;
      }
    }
  }, -2);

  return null;
}

/** Stellt dem Controller eine Funktion bereit, die das aktuelle Bild als PNG liefert */
function Snapshot({ controller }: { controller: BoxController }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    controller.snapshot = () => captureGL(gl, scene, camera);
    return () => {
      controller.snapshot = null;
    };
  }, [gl, scene, camera, controller]);
  return null;
}

/**
 * Stop-Motion-Takt: Die Puppen rücken `fps`-mal pro Sekunde weiter (siehe Rig).
 * Im Strick-Modus rendert der Canvas nur auf Anforderung: einmal pro Schritt und
 * solange etwas flüssig laufen soll (Ziehen, Kameraflug, Farbwechsel).
 */
function Ticker({ controller, fps }: { controller: BoxController; fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    controller.stepFps = fps;
    controller.invalidate = () => invalidate();
    if (!fps) return;
    const id = setInterval(() => invalidate(), 1000 / fps);
    return () => {
      clearInterval(id);
      controller.invalidate = () => {};
    };
  }, [controller, fps, invalidate]);
  useFrame(() => {
    if (fps && (controller.drag || Date.now() < controller.busyUntil)) invalidate();
  });
  return null;
}

function FirstFrames({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    n.current += 1;
    if (n.current === 3) onReady();
  });
  return null;
}

/** Schräglage des Papierschilds, fest je Planet */
const tagTilt = (index: number) => ((index * 37) % 9) - 4;

/**
 * Bild des ganzen Kastens: erst aus dem Zoom zurück in die Grundansicht,
 * dann Aufnahme. Liefert das Bild und die Schilder zum Nachzeichnen.
 */
export async function captureBox(controller: BoxController) {
  controller.zoomId = null;
  const t0 = Date.now();
  while (controller.zoomT > 0.01 && Date.now() - t0 < 1500) {
    await new Promise((r) => setTimeout(r, 50));
  }
  const image = (await controller.snapshot?.()) ?? null;
  const p = controller.lastLabels;
  const labels = STICKER_IDS.map((id, i) => ({
    name: boxName(id),
    x: p[i * 3] ?? -999,
    y: p[i * 3 + 1] ?? -999,
    k: p[i * 3 + 2] ?? 1,
    tilt: tagTilt(i),
  }));
  return { image, labels, size: { ...controller.size } };
}

/** Handgeschriebenes Papierschild, folgt seinem Planeten */
function Sticker({
  index,
  name,
  active,
  knit,
  labelPos,
}: {
  index: number;
  name: string;
  active: boolean;
  /** Strick: genähtes Stoff-Etikett statt Papierschild */
  knit: boolean;
  labelPos: SharedValue<number[]>;
}) {
  const tilt = tagTilt(index);
  const style = useAnimatedStyle(() => {
    const p = labelPos.value;
    const x = p[index * 3] ?? -999;
    const y = p[index * 3 + 1] ?? -999;
    const k = p[index * 3 + 2] ?? 1;
    return {
      transform: [{ translateX: x - 60 }, { translateY: y }, { scale: k }],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.tag, style]}>
      {/* Knoten am Faden und kurze Schnur zum Schild */}
      <View style={styles.knot} />
      <View
        style={[
          styles.tagString,
          { transform: [{ rotate: `${tilt * 0.6}deg` }] },
        ]}
      />
      <Text
        style={[
          styles.tagText,
          knit && styles.tagKnit,
          active && styles.tagActive,
          { transform: [{ rotate: `${tilt}deg` }] },
        ]}
        numberOfLines={1}
      >
        {name}
      </Text>
    </Animated.View>
  );
}

/* ---------- Komponente ---------- */

export function Diorama({
  controller,
  look,
  onPick,
  onReorder,
}: {
  controller: BoxController;
  /** Aufbau und Material; Wechsel des Aufbaus baut die Szene neu */
  look: { style: BoxStyle; material: BoxMaterial };
  onPick: (body: Body | null) => void;
  /** Bastelmodus: Planet an einen anderen Faden gehängt */
  onReorder?: (order: string[]) => void;
}) {
  const focused = useIsFocused();
  const [aspect, setAspect] = useState<number | null>(null);
  const labelPos = useSharedValue<number[]>([]);
  const [ready, setReady] = useState(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const layout = useMemo(() => {
    if (aspect === null) return null;
    const next = layoutFor(aspect, controller.order, look.style);
    controller.init(next, aspect);
    return next;
  }, [aspect, controller, look.style]);

  const gesture = useMemo(() => {
    let start = { x: 0, y: 0, t: 0 };
    let moved = false;
    let grabbed: Body | null = null;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        start = {
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
          t: Date.now(),
        };
        moved = false;
        grabbed = controller.pick(start.x, start.y);
        controller.invalidate();
      },
      onPanResponderMove: (_, g) => {
        if (!moved && Math.hypot(g.dx, g.dy) > 6) {
          moved = true;
          if (grabbed && isPlanet(grabbed)) controller.startDrag(grabbed.id);
        }
        if (moved) controller.moveDrag(g.dx, g.dy);
        if (controller.editing && controller.drag) {
          controller.hoverIndex = controller.dropIndex(start.x + g.dx, start.y + g.dy);
        }
        controller.invalidate();
      },
      onPanResponderRelease: (_, g) => {
        controller.hoverIndex = -1;
        controller.keepBusy();
        controller.invalidate();
        if (controller.drag) {
          const id = controller.drag.id;
          controller.endDrag();
          if (controller.editing) {
            // Bastelmodus: dort ablegen, wo der Finger losgelassen hat
            const from = controller.order.indexOf(id);
            const to = controller.dropIndex(start.x + g.dx, start.y + g.dy);
            if (from >= 0 && to >= 0 && to !== from) {
              const order = [...controller.order];
              order.splice(from, 1);
              order.splice(to, 0, id);
              controller.setOrder(order);
              onReorderRef.current?.(order);
            }
          }
          return;
        }
        if (!moved && Date.now() - start.t < 350) {
          const planetId = grabbed && isPlanet(grabbed) ? grabbed.id : null;
          // Doppeltipp zoomt heran oder wieder heraus, einfacher Tipp wählt aus.
          // Beim Basteln kein Zoom, da wählt jeder Tipp den Planeten zum Bemalen.
          if (!controller.editing && controller.tap(planetId)) return;
          onPickRef.current(grabbed);
          return;
        }
        // Wischen ins Leere: ein Luftzug, alle schwingen ein bisschen
        const vx = Math.max(-1.6, Math.min(1.6, g.vx * 1.1));
        const vy = Math.max(-1.2, Math.min(1.2, g.vy * 0.8));
        controller.push(vx, vy);
      },
      onPanResponderTerminate: () => controller.endDrag(),
      onPanResponderTerminationRequest: () => false,
    });
  }, [controller]);

  return (
    <View
      style={styles.root}
      onLayout={(e) =>
        setAspect(
          e.nativeEvent.layout.width / Math.max(1, e.nativeEvent.layout.height)
        )
      }
    >
      {layout && (
        <View key={`${layout.W}-${look.style}`} style={StyleSheet.absoluteFill}>
          <Canvas
            style={styles.canvas}
            // Höchstens 1,5-fache Pixeldichte: auf Retina kaum sichtbar, spart fast die Hälfte der Pixel
            dpr={[1, 1.5]}
            // Strick: Puppen rücken nur 12-mal pro Sekunde, dazwischen wäre jedes Bild gleich.
            // Also nur bei Bedarf rendern; Ziehen, Zoom und Überblendungen bekommen jedes Bild.
            frameloop={focused ? (look.material === 'knit' ? 'demand' : 'always') : 'never'}
            gl={{ antialias: isWeb }}
            camera={{ fov: 38, near: 0.1, far: 200, position: [0, 0, 20] }}
          >
            <color attach="background" args={[color.space]} />
            <BoxShell layout={layout} controller={controller} />
            <SunDome layout={layout} controller={controller} />
            {BOX_BODIES.map((b) => (
              <React.Fragment key={b.id}>
                <HangingPlanet body={b} controller={controller} />
                <Blob id={b.id} controller={controller} />
              </React.Fragment>
            ))}
            <Threads controller={controller} />
            <Arcs controller={controller} />
            <Ticker controller={controller} fps={look.material === 'knit' ? 12 : 0} />
            <Rig controller={controller} labelPos={labelPos} />
            <Snapshot controller={controller} />
            <FirstFrames onReady={() => setReady(true)} />
          </Canvas>
        </View>
      )}
      {!ready && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.loader]}
        >
          <Text style={[type.bodySmall as any, { color: color.textMuted }]}>
            Schaukasten wird gebastelt
          </Text>
        </View>
      )}
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Schaukasten mit hängenden Planeten. Planeten ziehen zum Schwingen, antippen für Infos, doppelt tippen zum Heranzoomen."
        {...gesture.panHandlers}
      />
      {ready &&
        STICKER_IDS.map((id, i) => (
          <Sticker
            key={id}
            index={i}
            name={boxName(id)}
            active={controller.selectedId === id}
            knit={look.material === 'knit'}
            labelPos={labelPos}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  canvas: { flex: 1 },
  loader: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.space,
  },
  tag: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 120,
    alignItems: 'center',
    // Skalieren um den Knoten oben, damit das Schild am Faden bleibt
    transformOrigin: 'top',
  },
  knot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EDE6D6',
    marginTop: -2,
  },
  tagString: { width: 1, height: 14, backgroundColor: '#EDE6D6' },
  tagText: {
    ...(type.hand as object),
    fontSize: 19,
    lineHeight: 22,
    paddingHorizontal: space.xs,
    paddingTop: 2,
    color: '#2A2418',
    backgroundColor: '#F4EFE4',
    borderRadius: 2,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.35)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 1.5,
        shadowOffset: { width: 0, height: 1 },
      },
    }),
  },
  // Stoff-Etikett mit Steppnaht
  tagKnit: {
    backgroundColor: '#E9DFC9',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#8C6A52',
    borderRadius: 4,
  },
  // Gewählt: Schild in Tinte statt Papier. Der weiße Akzent wäre auf dem hellen Papier unsichtbar.
  tagActive: { backgroundColor: '#2A2418', color: '#F4EFE4' },
});

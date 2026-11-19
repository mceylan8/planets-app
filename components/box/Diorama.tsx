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
import { Body, bodies, isPlanet, sunBody } from '@/constants/planets';
import { pickNearest } from '@/lib/pick';
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
} from './shaders';

const isWeb = Platform.OS === 'web';
const SEG: [number, number] = isWeb ? [56, 40] : [40, 28];

/* ---------- Anordnung ---------- */

type Slot = { x: number; y: number; z: number; r: number };
type Layout = {
  W: number;
  H: number;
  D: number;
  sun: { x: number; r: number };
  slots: Record<string, Slot>;
};

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
};

function layoutFor(aspect: number): Layout {
  if (aspect < 0.9) {
    // Hochkant: drei Reihen untereinander
    const s = (x: number, y: number, z: number, id: string): Slot => ({
      x,
      y,
      z,
      r: R[id],
    });
    return {
      W: 6.4,
      H: 10,
      D: 4.4,
      sun: { x: 0, r: 1.7 },
      slots: {
        merkur: s(-2.3, 3.1, 0.5, 'merkur'),
        venus: s(-0.85, 2.5, -0.6, 'venus'),
        erde: s(0.8, 3.0, 0.4, 'erde'),
        mars: s(2.3, 2.3, -0.5, 'mars'),
        jupiter: s(-1.45, 0.4, -0.3, 'jupiter'),
        saturn: s(1.5, 0.8, 0.5, 'saturn'),
        uranus: s(-1.9, -1.6, 0.4, 'uranus'),
        neptun: s(1.75, -1.3, -0.5, 'neptun'),
      },
    };
  }
  // Quer: eine Reihe, Höhen versetzt, in der Mitte über der Sonne höher
  const s = (x: number, y: number, z: number, id: string): Slot => ({
    x,
    y,
    z,
    r: R[id],
  });
  return {
    W: 11.6,
    H: 6.6,
    D: 4.4,
    sun: { x: 0, r: 1.7 },
    slots: {
      merkur: s(-4.7, 0.7, 0.4, 'merkur'),
      venus: s(-3.5, 1.7, -0.6, 'venus'),
      erde: s(-2.15, 0.45, 0.5, 'erde'),
      mars: s(-0.85, 1.85, -0.4, 'mars'),
      jupiter: s(0.75, 1.15, 0.2, 'jupiter'),
      saturn: s(2.45, 1.8, -0.5, 'saturn'),
      uranus: s(3.75, 0.45, 0.5, 'uranus'),
      neptun: s(4.85, 1.5, -0.3, 'neptun'),
    },
  };
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

export function createBoxController() {
  const c = {
    layout: layoutFor(1),
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
    init(layout: Layout) {
      c.layout = layout;
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
        c.pivots[id] = new THREE.Vector3(s.x, layout.H / 2, s.z);
        i++;
      }
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
    },
    startDrag(id: string) {
      const cam = c.camera;
      const p = c.pendulums[id];
      if (!cam || !p) return;
      const L = Math.max(0.8, c.layout.H / 2 - c.layout.slots[id].y);
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
      };
      p.vx = 0;
      p.vz = 0;
    },
    moveDrag(dxPx: number, dyPx: number) {
      const d = c.drag;
      if (!d) return;
      const p = c.pendulums[d.id];
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
        p.vx += vx * (0.8 + Math.random() * 0.4);
        p.vz += vy * (0.5 + Math.random() * 0.3);
        p.spinV += Math.abs(vx) * 1.5;
      }
    },
    /** Körper unter dem Finger, großzügig */
    pick(x: number, y: number): Body | null {
      if (!c.camera) return null;
      const { sun, H, D } = c.layout;
      return pickNearest<Body>(c.camera, c.size, x, y, [
        ...bodies.filter(isPlanet).map((b) => ({
          item: b as Body,
          position: c.positions[b.id],
          radius: c.layout.slots[b.id].r,
          reach: (r: number) => r + 16,
        })),
        {
          item: sunBody,
          position: new THREE.Vector3(sun.x, -H / 2 + sun.r * 0.5, -D * 0.15),
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

/** Licht kommt von der Sonne unten in der Box — sie ist die Lampe. */
function lamp(layout: Layout) {
  const { sun, H, D } = layout;
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
  });
  useFrame(() => {
    // Wände hell, wenn die Sonne brennt
    material.uniforms.uBright.value = sunLit(controller.lampMode) ? 1 : 0;
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
  return (
    <group position={[x, -H / 2, zc]}>
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
  const slot = controller.layout.slots[body.id];
  const group = useRef<THREE.Group>(null);
  const spinner = useRef<THREE.Group>(null);
  const material = useShader(papierShader, {
    uMap: { value: placeholder },
    uLamp: { value: lamp(controller.layout) },
    uEmissive: { value: 0.45 },
    uBright: { value: 1 },
    uFlat: { value: 0 },
  });
  useBake([bakeJobFor(body, material)]);
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
    // Exakt entlang des Fadens ausrichten, damit Stab und Schnüre am Faden sitzen
    dir.copy(controller.pivot(body.id)).sub(pos).normalize();
    group.current.quaternion.setFromUnitVectors(UP, dir);
    if (spinner.current) spinner.current.rotation.y = p.spin;
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
      <group rotation={[0, 0, tilt * 0.35]}>
        <group ref={spinner}>
          <mesh material={material}>
            <sphereGeometry args={[slot.r, SEG[0], SEG[1]]} />
          </mesh>
          <mesh material={outlineMaterial} scale={1.045}>
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

  useFrame(() => {
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
    <group>
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

const STICKER_IDS = bodies.filter(isPlanet).map((b) => b.id);

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

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    for (const id in controller.pendulums) {
      const p = controller.pendulums[id];
      const slot = controller.layout.slots[id];
      const L = Math.max(0.8, controller.layout.H / 2 - slot.y);
      const w2 = 9.8 / L;
      const idle = controller.idle ? 0.06 : 0;
      const fx =
        -w2 * Math.sin(p.ax) - 0.9 * p.vx + idle * Math.sin(t * 0.7 + p.phase);
      const fz =
        -w2 * Math.sin(p.az) -
        0.9 * p.vz +
        idle * Math.cos(t * 0.55 + p.phase * 1.3);
      if (controller.drag?.id !== id) {
        p.vx += fx * dt;
        p.vz += fz * dt;
        p.ax = Math.max(-0.7, Math.min(0.7, p.ax + p.vx * dt));
        p.az = Math.max(-0.5, Math.min(0.5, p.az + p.vz * dt));
      }
      p.spinV *= Math.exp(-dt * 1.2);
      p.spin += (0.18 + p.spinV) * dt;
      const top = controller.pivot(id);
      controller.positions[id].set(
        top.x + L * Math.sin(p.ax),
        top.y - L * Math.cos(p.ax) * Math.cos(p.az),
        top.z + L * Math.sin(p.az)
      );
    }
    // Kamera: zwischen Grundansicht und Zoom auf den gewählten Planeten
    const cam = controller.camera;
    if (cam) {
      controller.zoomT +=
        ((controller.zoomId ? 1 : 0) - controller.zoomT) *
        (1 - Math.exp(-dt * 4));
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
          .multiplyScalar(tagHeight(id, r))
          .add(pos);
        const pxPerUnit =
          controller.size.height / 2 / (v.distanceTo(cam.position) * tanHalf);
        v.project(cam);
        out[i * 3] = ((v.x + 1) / 2) * controller.size.width;
        out[i * 3 + 1] = ((1 - v.y) / 2) * controller.size.height;
        out[i * 3 + 2] = Math.max(0.85, Math.min(3.2, pxPerUnit / 52));
      });
      labelPos.value = out;
    }
  }, -2);

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

/** Handgeschriebenes Papierschild, folgt seinem Planeten */
function Sticker({
  index,
  name,
  active,
  labelPos,
}: {
  index: number;
  name: string;
  active: boolean;
  labelPos: SharedValue<number[]>;
}) {
  const tilt = ((index * 37) % 9) - 4;
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
  onPick,
}: {
  controller: BoxController;
  onPick: (body: Body | null) => void;
}) {
  const focused = useIsFocused();
  const [aspect, setAspect] = useState<number | null>(null);
  const labelPos = useSharedValue<number[]>([]);
  const [ready, setReady] = useState(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const layout = useMemo(() => {
    if (aspect === null) return null;
    const next = layoutFor(aspect);
    controller.init(next);
    return next;
  }, [aspect, controller]);

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
      },
      onPanResponderMove: (_, g) => {
        if (!moved && Math.hypot(g.dx, g.dy) > 6) {
          moved = true;
          if (grabbed && isPlanet(grabbed)) controller.startDrag(grabbed.id);
        }
        if (moved) controller.moveDrag(g.dx, g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (controller.drag) {
          controller.endDrag();
          return;
        }
        if (!moved && Date.now() - start.t < 350) {
          const planetId = grabbed && isPlanet(grabbed) ? grabbed.id : null;
          // Doppeltipp zoomt heran oder wieder heraus, einfacher Tipp wählt aus
          if (controller.tap(planetId)) return;
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
        <View key={layout.W} style={StyleSheet.absoluteFill}>
          <Canvas
            style={styles.canvas}
            dpr={[1, 2]}
            frameloop={focused ? 'always' : 'never'}
            gl={{ antialias: isWeb }}
            camera={{ fov: 38, near: 0.1, far: 200, position: [0, 0, 20] }}
          >
            <color attach="background" args={[color.space]} />
            <BoxShell layout={layout} controller={controller} />
            <SunDome layout={layout} controller={controller} />
            {bodies.filter(isPlanet).map((b) => (
              <React.Fragment key={b.id}>
                <HangingPlanet body={b} controller={controller} />
                <Blob id={b.id} controller={controller} />
              </React.Fragment>
            ))}
            <Threads controller={controller} />
            <Rig controller={controller} labelPos={labelPos} />
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
            name={bodies.find((b) => b.id === id)!.name}
            active={controller.selectedId === id}
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
  tagActive: { backgroundColor: color.accent, color: color.onAccent },
});

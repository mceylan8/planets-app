/**
 * Sternenkasten: derselbe Bastelkarton wie im Schaukasten, aber darin nur die
 * Erde mit Mond. Rundherum Sternbilder, entweder innen auf einer Glaskuppel
 * oder als Tierkreis auf einem Messingring. Licht aus: die Sterne leuchten.
 */
import { useIsFocused } from '@react-navigation/native';
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as THREE from 'three';

import { Canvas, useFrame, useThree } from '@/lib/r3f';
import { PickCandidate, pickNearest } from '@/lib/pick';
import { Planet, getPlanet, planets } from '@/constants/planets';
import { Constellation, constellations, famous, zodiac } from '@/constants/constellations';
import { color, type } from '@/constants/theme';
import {
  kindIndex,
  placeholder,
  srgb,
  surfaceUniforms,
  useBake,
} from '@/components/solar/bodies';
import {
  cardboardShader,
  flatToonShader,
  papierShader,
} from '@/components/box/shaders';

const isWeb = Platform.OS === 'web';

export type SkyStyle = 'dome' | 'ring' | 'earth';

/* ---------- Zustand außerhalb von React, damit Frames nicht neu rendern ---------- */

export function createSkyController() {
  const ctl = {
    style: 'dome' as SkyStyle,
    lightOn: true,
    aurora: false,
    /** Was im Kasten zu sehen ist, alles einzeln schaltbar */
    show: {
      milky: true,
      planets: true,
      walls: true,
      perseiden: false,
      leoniden: false,
      geminiden: false,
      lyriden: false,
    },
    yaw: 0.4,
    pitch: 0.12,
    vyaw: 0,
    dragging: false,
    /** Langsames Drehen der Ansicht (aus = Standbild) */
    idle: false,
    /** Animationsmodus „Himmel öffnen“: Sterne lösen sich von den Wänden */
    anim: false,
    /** Animationsmodus „Planetarium“: Sterne gleiten über die Kartonwände */
    planetarium: false,
    /** 0..1 weicher Übergang ins Planetarium */
    pT: 0,
    /** Wie weit sich der Wandhimmel im Planetarium gedreht hat */
    projAngle: 0,
    /** Drehachse (Erdachse) in Weltkoordinaten, inklusive Ziehen */
    axisWorld: new THREE.Vector3(0, 1, 0),
    /** Kastenmaße, für die Projektion auf die Wände */
    box: { W: 8, H: 8, D: 7 },
    /** 0 = Standbild, 1 = Sterne am Himmel; läuft weich hin und her */
    animT: 0,
    /** Drehwinkel des Himmels um die Erdachse */
    skyAngle: 0,
    /** Wie schnell der Himmel sich gerade dreht (0..1, weich an und aus) */
    spinF: 0,
    /** Bewegung reduzieren: kein Flug, nur Überblenden */
    reduceMotion: false,
    /** Weltmatrix des drehenden Himmels, für Sterne, die dorthin fliegen */
    skyMatrix: new THREE.Matrix4(),
    /** Planeten aus Papier zum Antippen */
    planetSpots: {} as Record<string, { live: THREE.Vector3; name: string }>,
    /** Namensschild über dem Gewählten, vom Canvas gesetzt */
    label: { x: 0, y: 0, visible: false },
    /** Vom Bildschirm gesetzt: Werte fürs Namensschild auf dem UI-Thread */
    labelSV: null as null | { x: SharedValue<number>; y: SharedValue<number>; o: SharedValue<number> },
    selectedKind: null as 'constellation' | 'planet' | null,
    selectedId: null as string | null,
    camera: null as THREE.PerspectiveCamera | null,
    size: { width: 1, height: 1 },
    /** Sternbild-Gruppen der aktuellen Ansicht, zum Antippen */
    groups: {} as Record<
      string,
      { group: THREE.Group; center: THREE.Vector3; item: Constellation; live: THREE.Vector3 }
    >,
    k: 1,
    pick(x: number, y: number): Pick | null {
      if (!ctl.camera) return null;
      const visible = (o: THREE.Object3D | null): boolean =>
        !o || (o.visible && visible(o.parent));
      const candidates: PickCandidate<Pick>[] = Object.values(ctl.groups)
        .filter((g) => visible(g.group))
        .map((g) => ({
          item: { kind: 'constellation' as const, id: g.item.id, name: g.item.name },
          position: g.live,
          radius: 0.55 * ctl.k,
          reach: (r: number) => Math.max(r + 10, 36),
        }));
      if (ctl.show.planets)
        for (const [id, sp] of Object.entries(ctl.planetSpots))
          candidates.push({
            item: { kind: 'planet', id, name: sp.name },
            position: sp.live,
            radius: 0.25 * ctl.k,
            // Planeten gewinnen vor Sternbildern, wenn beide nah sind
            penalty: -12,
          });
      return pickNearest(ctl.camera, ctl.size, x, y, candidates);
    },
  };
  return ctl;
}
export type SkyController = ReturnType<typeof createSkyController>;

export type Pick = { kind: 'constellation' | 'planet'; id: string; name: string };

/* ---------- Maße ---------- */

type Layout = { W: number; H: number; D: number };

function layoutFor(aspect: number): Layout {
  const a = Math.min(2, Math.max(0.5, aspect));
  return a >= 1 ? { W: 8 * a, H: 8, D: 7 } : { W: 8, H: 8 / a, D: 7 };
}

/** Lampe oben links vorne, wie eine Schreibtischlampe über dem offenen Karton */
function lampOf({ W, H, D }: Layout) {
  return new THREE.Vector3(-W * 0.25, H * 0.45, D * 0.45);
}

/** Inhalt in eigenen Einheiten: Erde Radius 1, Kuppel 3, Ring 3,2 */
const DOME_R = 3;
const RING_R = 3.2;

/* ---------- Sternbilder platzieren ---------- */

type Placement = {
  c: Constellation;
  stars: THREE.Vector3[];
  center: THREE.Vector3;
  /** Nur flach an der Wand: Richtungen auf der Fläche, für Sternschnuppen */
  axes?: { r: THREE.Vector3; u: THREE.Vector3 };
};

function domePlacements(): Placement[] {
  // Auf der Kuppel die Sternbilder abseits des Tierkreises, der Tierkreis klebt an den Wänden
  const list = famous;
  const n = list.length;
  const worldUp = new THREE.Vector3(0, 1, 0);
  return list.map((c, i) => {
    // Gleichmäßig über die Kuppel, unten bleibt Platz für den Sockel
    const y = 0.92 - ((i + 0.5) / n) * 1.45;
    const r = Math.sqrt(1 - y * y);
    const th = i * 2.39996;
    const nrm = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
    const t1 = new THREE.Vector3().crossVectors(worldUp, nrm).normalize();
    const t2 = new THREE.Vector3().crossVectors(nrm, t1);
    const s = 0.6;
    const stars = c.stars.map(([x, yy]) =>
      nrm
        .clone()
        .multiplyScalar(DOME_R)
        .addScaledVector(t1, -x * s)
        .addScaledVector(t2, yy * s)
        .normalize()
        .multiplyScalar(DOME_R * 0.985)
    );
    return { c, stars, center: nrm.clone().multiplyScalar(DOME_R) };
  });
}

function ringPlacements(): Placement[] {
  return zodiac.map((c, i) => {
    const a = (i / zodiac.length) * Math.PI * 2;
    const nrm = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const t1 = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const s = 0.62;
    const stars = c.stars.map(([x, y]) =>
      nrm
        .clone()
        .multiplyScalar(RING_R)
        .addScaledVector(t1, -x * s)
        .add(new THREE.Vector3(0, y * s + 0.75, 0))
    );
    return { c, stars, center: nrm.clone().multiplyScalar(RING_R).setY(0.75) };
  });
}

/* ---------- Bausteine ---------- */

const projQ = new THREE.Quaternion();

/**
 * Planetarium: Punkt um die Erdachse drehen und wieder auf die Kartonwand
 * werfen (Strahl von der Mitte). Liefert die Fläche, -1 = offene Vorderseite.
 */
function projectOnBox(
  src: THREE.Vector3,
  ctl: SkyController,
  out: THREE.Vector3,
  e = 0.03
): number {
  out.copy(src).applyQuaternion(projQ);
  const { W, H, D } = ctl.box;
  const ax = Math.abs(out.x) / (W / 2 - e);
  const ay = Math.abs(out.y) / (H / 2 - e);
  const az = Math.abs(out.z) / (D / 2 - e);
  const m = Math.max(ax, ay, az, 1e-6);
  out.multiplyScalar(1 / m);
  if (m === az) return out.z > 0 ? -1 : 4;
  if (m === ax) return out.x > 0 ? 1 : 0;
  return out.y > 0 ? 2 : 3;
}

const projInvQ = new THREE.Quaternion();
const projInvM4 = new THREE.Matrix4();
/** Rückwärts-Drehung als Matrix, geteilt mit allen Wand-Shadern */
const projInv3 = new THREE.Matrix3();

/** Einmal pro Bild: Drehung fürs Planetarium */
function updateProjection(ctl: SkyController) {
  projQ.setFromAxisAngle(ctl.axisWorld, ctl.projAngle);
  projInvQ.copy(projQ).invert();
  projInv3.setFromMatrix4(projInvM4.makeRotationFromQuaternion(projInvQ));
}

/**
 * Instanzen (Sternenstaub) im Planetarium mitdrehen. Auf der Wand: wieder auf
 * die Wand werfen. Im Raum: nur zurückholen, wenn sie hinausfallen.
 */
function projectInstances(
  mesh: THREE.InstancedMesh,
  home: { p: THREE.Vector3; s: number }[],
  ctl: SkyController,
  surface: boolean
) {
  const { W, H, D } = ctl.box;
  const e = surface ? 0.02 : 0.05;
  home.forEach(({ p, s: sc }, i) => {
    const q = tmp.position.copy(p).applyQuaternion(projQ);
    const m = Math.max(Math.abs(q.x) / (W / 2 - e), Math.abs(q.y) / (H / 2 - e), Math.abs(q.z) / (D / 2 - e));
    if (surface || m > 1) q.multiplyScalar(1 / m);
    // Die offene Vorderseite hat keine Wand
    tmp.scale.setScalar(q.z > D / 2 - 0.3 ? 0 : sc);
    tmp.updateMatrix();
    mesh.setMatrixAt(i, tmp.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
}

/** Weich rein und raus, für alle Flüge */
function ease(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
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
    []
  );
  useEffect(() => () => m.dispose(), [m]);
  return m;
}

/**
 * Wie das Papier im Schaukasten, aber mit kleineren gemalten Sternen,
 * die bei Licht aus ganz schwach glimmen wie Leuchtsticker.
 */
const wallShader = {
  vertex: /* glsl */ `
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`,
  fragment: /* glsl */ `
uniform vec3 uColor;
uniform vec3 uStar;
uniform vec3 uLamp;
uniform float uBright;
uniform float uGlow;
uniform float uOpen;
uniform float uMilky;
uniform vec3 uHalf;
uniform mat3 uInvRot;
varying vec3 vN;
varying vec3 vWorld;
varying vec2 vUv;
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + 1.0), f.x), f.y);
}
float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float vnoise3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
    mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + 1.0), f.x), f.y),
    f.z);
}
float fbm3(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * vnoise3(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  // Papier bleibt, wo es ist
  vec3 an = abs(normalize(vN));
  vec2 pq = an.z > 0.5 ? vWorld.xy : (an.x > 0.5 ? vWorld.zy : vWorld.xz);
  float fiber = vnoise(pq * 9.0) * 0.08 + vnoise(pq * 31.0) * 0.04;
  vec3 col = uColor * (0.94 + fiber);

  // Der gemalte Himmel dreht sich: Punkt zurückdrehen und auf den Karton werfen
  vec3 q = uInvRot * vWorld;
  vec3 aq = abs(q) / uHalf;
  q /= max(aq.x, max(aq.y, aq.z));
  vec2 f2;
  float face;
  if (aq.z >= aq.x && aq.z >= aq.y) { f2 = q.xy; face = q.z > 0.0 ? 5.0 : 4.0; }
  else if (aq.x >= aq.y) { f2 = q.zy; face = q.x > 0.0 ? 1.0 : 0.0; }
  else { f2 = q.xz; face = q.y > 0.0 ? 2.0 : 3.0; }

  vec2 g = f2 / 0.55;
  vec2 cell = floor(g);
  float h = hash2(cell + face * 17.3);
  float star = 0.0;
  if (h > 0.7) {
    vec2 c = fract(g) - 0.5 + (vec2(hash2(cell + 3.1), hash2(cell + 7.7)) - 0.5) * 0.5;
    float r = length(c);
    float a = atan(c.y, c.x) + h * 6.28;
    float k = 0.5 + 0.5 * cos(5.0 * a);
    float size = 0.06 + 0.07 * hash2(cell + 1.3);
    float edge = mix(0.42, 1.0, k) * size;
    star = 1.0 - smoothstep(edge * 0.85, edge, r);
    col = mix(col, uStar, star * 0.9);
  }

  float lamp = 0.62 + 0.38 * max(dot(normalize(vN), normalize(uLamp - vWorld)), 0.0);
  lamp = mix(0.28, lamp, uBright);
  vec2 e = min(vUv, 1.0 - vUv);
  float corner = smoothstep(0.0, 0.18, min(e.x, e.y));
  col *= lamp * mix(0.62, 1.0, corner);
  // Leuchtsticker: im Dunkeln nur ein Hauch
  col += uStar * star * uGlow * 0.16;
  // Animation: der Karton tritt zurück, dahinter nur Nacht
  col = mix(col, vec3(0.012, 0.016, 0.04), uOpen * 0.9);

  // Milchstraße als Band einmal rund um den Himmel, dreht mit
  if (uMilky > 0.002) {
    vec3 dn = normalize(q);
    float gb = dot(dn, normalize(vec3(0.45, -1.0, 0.0)));
    float band = exp(-gb * gb * 26.0);
    float cl = fbm3(dn * 4.0 + 3.1);
    float dust = smoothstep(0.55, 0.75, fbm3(dn * 7.0 + 9.0)) * band * 0.6;
    float k = max(band * (0.3 + 0.9 * cl) - dust, 0.0) * uMilky;
    vec3 mc = mix(vec3(0.42, 0.38, 0.85), vec3(1.0, 0.92, 0.85), smoothstep(0.4, 0.9, cl * band));
    col += mc * k * 0.7;
  }
  gl_FragColor = vec4(col, 1.0);
}
`,
};

function Wall({
  w,
  h,
  position,
  rotation,
  tint,
  seed,
  layout,
  ctl,
}: {
  w: number;
  h: number;
  position: [number, number, number];
  rotation: [number, number, number];
  tint: string;
  seed: number;
  layout: Layout;
  ctl: SkyController;
}) {
  const m = useShader(wallShader, {
    uColor: { value: srgb(tint) },
    uStar: { value: srgb('#F2C94C') },
    uHalf: { value: new THREE.Vector3(layout.W / 2, layout.H / 2, layout.D / 2) },
    uInvRot: { value: projInv3 },
    uMilky: { value: 0 },
    uLamp: { value: lampOf(layout) },
    uBright: { value: 1 },
    uGlow: { value: 0 },
    uOpen: { value: 0 },
  });
  useFrame(() => {
    m.uniforms.uBright.value = ctl.lightOn ? 1 : 0;
    m.uniforms.uOpen.value = ease(ctl.animT);
    const milky =
      (ctl.show.milky ? 1 : 0) * (1 - 0.75 * ease(ctl.animT)) * (ctl.lightOn ? 0.35 : 0.85);
    m.uniforms.uMilky.value += (milky - m.uniforms.uMilky.value) * 0.08;
    const g = m.uniforms.uGlow;
    g.value += ((ctl.lightOn ? 0 : 1) - g.value) * 0.06;
  });
  return (
    <mesh position={position} rotation={rotation} material={m}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
}

/** Der Karton: gleiche Pappe und gleiches Nachtblau wie im Schaukasten */
function Carton({ layout, ctl }: { layout: Layout; ctl: SkyController }) {
  const { W, H, D } = layout;
  const t = 0.22;
  const card = useShader(cardboardShader, {
    uColor: { value: srgb('#B8895A') },
    uLamp: { value: lampOf(layout) },
    uBright: { value: 1 },
  });
  const rim = useRef<THREE.Group>(null);
  useFrame(() => {
    card.uniforms.uBright.value = ctl.lightOn ? 1 : 0;
    // Himmel öffnen: der Rand verschwindet, damit die Sterne den ganzen Raum haben
    if (rim.current) rim.current.visible = ctl.animT < 0.35;
  });
  const z = D / 2 + t / 2;
  const p = { layout, ctl };
  return (
    <group>
      <Wall w={W} h={H} position={[0, 0, -D / 2]} rotation={[0, 0, 0]} tint="#1E2A6B" seed={11} {...p} />
      <Wall w={W} h={D} position={[0, -H / 2, 0]} rotation={[-Math.PI / 2, 0, 0]} tint="#1A2460" seed={12} {...p} />
      <Wall w={W} h={D} position={[0, H / 2, 0]} rotation={[Math.PI / 2, 0, 0]} tint="#162055" seed={13} {...p} />
      <Wall w={D} h={H} position={[-W / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]} tint="#1B2664" seed={14} {...p} />
      <Wall w={D} h={H} position={[W / 2, 0, 0]} rotation={[0, -Math.PI / 2, 0]} tint="#1B2664" seed={15} {...p} />
      <group ref={rim}>
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
    </group>
  );
}

const starGeo = new THREE.IcosahedronGeometry(1, 1);
const tmp = new THREE.Object3D();

/** Viele kleine Sterne im ganzen Karton, sie drehen sich nicht mit */
function StarDust({ layout, ctl }: { layout: Layout; ctl: SkyController }) {
  const n = 240;
  const ref = useRef<THREE.InstancedMesh>(null);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#EEF0FA', transparent: true, opacity: 0.5 }),
    []
  );
  const home = useMemo(() => [] as { p: THREE.Vector3; s: number }[], []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const { W, H, D } = layout;
    home.length = 0;
    let seed = 3;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n; i++) {
      // Meist nah an den Wänden, damit die Mitte frei für die Erde bleibt
      const p = new THREE.Vector3(
        (rnd() - 0.5) * (W - 0.4),
        (rnd() - 0.5) * (H - 0.4),
        -D / 2 + 0.05 + rnd() * D * 0.55
      );
      if (p.length() < 3.6 * ctl.k) p.z = -D / 2 + 0.05;
      home.push({ p: p.clone(), s: 0.018 + rnd() * 0.03 });
      tmp.position.copy(p);
      tmp.scale.setScalar(home[i].s);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [layout, ctl]);
  const moved = useRef(false);
  useFrame(() => {
    const goal = ctl.lightOn ? 0.45 : 0.95;
    mat.opacity += (goal - mat.opacity) * 0.08;
    const mesh = ref.current;
    const active = Math.abs(ctl.projAngle) > 1e-4;
    if (!mesh || (!active && !moved.current)) return;
    projectInstances(mesh, home, ctl, false);
    moved.current = active;
  });
  return <instancedMesh ref={ref} args={[starGeo, mat, n]} frustumCulled={false} />;
}

type Fly = { to: THREE.Vector3[]; delay: number };

const tmpV = new THREE.Vector3();

/**
 * Ein Sternbild. „gold“: gemalte Sterne auf Kuppel und Ring.
 * „hole“: Lochkarton an der Wand, Bleistiftstriche, bei Licht aus scheint es durch.
 * Mit `fly` löst es sich im Animationsmodus von der Wand und fliegt an den Himmel.
 */
function ConstellationMesh({
  place,
  ctl,
  tag = 'inner',
  variant = 'gold',
  fly,
  expand,
}: {
  place: Placement;
  ctl: SkyController;
  tag?: string;
  variant?: 'gold' | 'hole';
  fly?: Fly;
  /** Himmel öffnen: so weit wandern Kuppel- und Ringsterne nach außen */
  expand?: number;
}) {
  const { c, stars, center } = place;
  const key = `${tag}:${c.id}`;
  const n = stars.length;
  const hole = variant === 'hole';
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.InstancedMesh>(null);
  const halo = useRef<THREE.InstancedMesh>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const mats = useMemo(
    () => ({
      star: new THREE.MeshBasicMaterial({ color: hole ? '#D9D2C0' : '#F2D15C' }),
      halo: new THREE.MeshBasicMaterial({
        color: '#FFE9A0',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
      line: hole
        ? new THREE.LineDashedMaterial({
            color: '#8A93BC',
            dashSize: 0.06,
            gapSize: 0.05,
            transparent: true,
            opacity: 0.85,
          })
        : new THREE.LineBasicMaterial({ color: '#F4EFE4', transparent: true, opacity: 0.6 }),
    }),
    [hole]
  );
  const cur = useMemo(() => stars.map((v) => v.clone()), [stars]);
  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(c.lines.length * 6), 3));
    return g;
  }, [c]);
  const live = useMemo(() => new THREE.Vector3(), []);
  useEffect(
    () => () => {
      lineGeo.dispose();
      mats.star.dispose();
      mats.halo.dispose();
      mats.line.dispose();
    },
    [lineGeo, mats]
  );

  const vis = useMemo(() => stars.map(() => 1), [stars]);
  const face = useMemo(() => stars.map(() => 0), [stars]);
  const write = (still = true) => {
    c.stars.forEach(([, , b], i) => {
      const r = (hole ? 0.035 + b * 0.04 : 0.05 + b * 0.055) * vis[i];
      tmp.position.copy(cur[i]);
      tmp.scale.setScalar(r);
      tmp.updateMatrix();
      core.current?.setMatrixAt(i, tmp.matrix);
      tmp.scale.setScalar(r * (hole ? 2.3 : 2.2));
      tmp.updateMatrix();
      halo.current?.setMatrixAt(i, tmp.matrix);
    });
    if (core.current) core.current.instanceMatrix.needsUpdate = true;
    if (halo.current) halo.current.instanceMatrix.needsUpdate = true;
    const pos = lineGeo.getAttribute('position') as THREE.BufferAttribute;
    c.lines.forEach(([a, b], i) => {
      // Linie über eine Kartonkante würde quer durch den Raum gehen: dann weglassen
      const keep = vis[a] > 0 && vis[b] > 0 && face[a] === face[b];
      const B = keep ? cur[b] : cur[a];
      pos.setXYZ(i * 2, cur[a].x, cur[a].y, cur[a].z);
      pos.setXYZ(i * 2 + 1, B.x, B.y, B.z);
    });
    pos.needsUpdate = true;
    lineGeo.computeBoundingSphere();
    // Strichelung neu vermessen kostet: nur im Stillstand
    if (hole && still) lines.current?.computeLineDistances();
  };

  useLayoutEffect(() => {
    cur.forEach((v, i) => v.copy(stars[i]));
    write();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stars, cur]);

  // Zum Antippen anmelden
  useEffect(() => {
    if (group.current) ctl.groups[key] = { group: group.current, center, item: c, live };
    return () => {
      delete ctl.groups[key];
    };
  }, [c, center, ctl, key, live]);

  const dark = useMemo(() => new THREE.Color(hole ? '#FFF3CF' : '#FFF6D0'), [hole]);
  const lit = useMemo(() => new THREE.Color(hole ? '#D9D2C0' : '#FFE58A'), [hole]);
  const pick = useMemo(() => new THREE.Color('#FFFFFF'), []);
  const lastT = useRef(0);
  const flown = useRef(0);
  const projected = useRef(false);
  const lastE = useRef(1);

  useFrame(() => {
    // Flug von der Wand an den Himmel
    let t = 0;
    if (fly) {
      t = ctl.reduceMotion ? (ctl.animT > 0.5 ? 1 : 0) : ease((ctl.animT - fly.delay) / 0.5);
      if (t > 0 || lastT.current > 0) {
        const lift = Math.sin(Math.PI * t) * 0.9 * ctl.k;
        for (let i = 0; i < n; i++) {
          tmpV.copy(fly.to[i]).applyMatrix4(ctl.skyMatrix);
          cur[i].lerpVectors(stars[i], tmpV, t);
          cur[i].z += lift;
        }
        write(t === 0 || t === 1);
      }
      lastT.current = t;
      flown.current = t;
      // Planetarium: bleibt auf dem Karton, gleitet aber rund um die Erde
      const active = Math.abs(ctl.projAngle) > 1e-4;
      if (t === 0 && (active || projected.current)) {
        for (let i = 0; i < n; i++) {
          const f = projectOnBox(stars[i], ctl, cur[i]);
          face[i] = f;
          // An der offenen Vorderseite tauchen sie kurz ab
          vis[i] = f === -1 ? 0 : 1;
        }
        if (!active) {
          for (let i = 0; i < n; i++) {
            cur[i].copy(stars[i]);
            vis[i] = 1;
            face[i] = 0;
          }
        }
        write(!active);
        projected.current = active;
      }
    }
    if (expand) {
      const e = 1 + (expand - 1) * (ctl.reduceMotion ? (ctl.animT > 0.5 ? 1 : 0) : ease(ctl.animT));
      if (Math.abs(e - lastE.current) > 1e-4) {
        for (let i = 0; i < n; i++) cur[i].copy(stars[i]).multiplyScalar(e);
        write(e === 1);
        lastE.current = e;
      }
    }
    // Mittelpunkt für Antippen und Namensschild
    live.set(0, 0, 0);
    for (const v of cur) live.add(v);
    live.multiplyScalar(1 / n);
    if (group.current) live.applyMatrix4(group.current.matrixWorld);

    const sel = ctl.selectedKind === 'constellation' && ctl.selectedId === c.id;
    const off = !ctl.lightOn;
    mats.star.color.lerp(sel ? pick : off || t > 0.5 ? dark : lit, 0.15);
    const lineGoal = sel ? 1 : off ? 0.7 : hole ? 0.85 : 0.6;
    mats.line.opacity += (lineGoal - mats.line.opacity) * 0.12;
    if (hole) (mats.line as THREE.LineDashedMaterial).color.set(sel || t > 0.5 ? '#EDE6D6' : '#8A93BC');
    // Lochkarton: im Dunkeln scheint Licht durch die Löcher, beim Flug leuchten sie
    const base = hole ? (off ? 0.2 : 0.03) : off ? 0.14 : 0.035;
    const haloGoal = Math.max(sel ? 0.45 : base, t * 0.15);
    mats.halo.opacity += (haloGoal - mats.halo.opacity) * 0.1;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={core} args={[starGeo, mats.star, n]} frustumCulled={false} />
      <instancedMesh ref={halo} args={[starGeo, mats.halo, n]} renderOrder={2} frustumCulled={false} />
      <lineSegments ref={lines} geometry={lineGeo} material={mats.line} frustumCulled={false} />
    </group>
  );
}

const glassShader = {
  vertex: /* glsl */ `
varying vec3 vN;
varying vec3 vV;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}
`,
  fragment: /* glsl */ `
uniform float uBright;
varying vec3 vN;
varying vec3 vV;
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.5);
  float a = 0.035 + f * 0.4;
  vec3 c = mix(vec3(0.72, 0.84, 1.0), vec3(1.0), f);
  gl_FragColor = vec4(c * mix(0.4, 1.0, uBright), a);
}
`,
};

/** Glaskuppel auf einem Pappsockel */
function Dome({ ctl }: { ctl: SkyController }) {
  const glass = useShader(
    glassShader,
    { uBright: { value: 1 } },
    { transparent: true, depthWrite: false }
  );
  useFrame(() => {
    const b = ctl.lightOn ? 1 : 0;
    glass.uniforms.uBright.value = b;
  });
  const cut = Math.PI;
  return (
    <group>
      <mesh material={glass} renderOrder={5}>
        <sphereGeometry args={[DOME_R, isWeb ? 64 : 48, 32, 0, Math.PI * 2, 0, cut]} />
      </mesh>
    </group>
  );
}

/** Messingring mit dem Tierkreis, leicht schräg wie die Ekliptik */
function ZodiacRing({ ctl }: { ctl: SkyController }) {
  const brass = useShader(flatToonShader, {
    uColor: { value: srgb('#C9A24A') },
    uLamp: { value: new THREE.Vector3(-3, 6, 6) },
    uBright: { value: 1 },
    uFlat: { value: 0 },
  });
  useFrame(() => {
    brass.uniforms.uBright.value = ctl.lightOn ? 1 : 0.5;
  });
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={brass}>
        <torusGeometry args={[RING_R, 0.035, 8, 128]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 1.5, 0]} material={brass}>
        <torusGeometry args={[RING_R, 0.02, 6, 128]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        // Speichen zwischen den Sternbildern halten die beiden Ringe zusammen
        const a = ((i + 0.5) / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * RING_R, 0.75, Math.sin(a) * RING_R]}
            material={brass}
          >
            <cylinderGeometry args={[0.018, 0.018, 1.5, 6]} />
          </mesh>
        );
      })}
    </group>
  );
}

const auroraShader = {
  vertex: /* glsl */ `
uniform float uTime;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  float a = uv.x * 6.2831853;
  // Vorhang wellt sich langsam
  p.xz *= 1.0 + 0.06 * sin(a * 7.0 + uTime * 0.8) * uv.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`,
  fragment: /* glsl */ `
uniform float uTime;
uniform float uStrength;
varying vec2 vUv;
void main() {
  float a = vUv.x * 6.2831853;
  float wave = 0.55 + 0.45 * sin(a * 5.0 + uTime * 0.7) * sin(a * 3.0 - uTime * 0.45);
  float fade = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
  vec3 col = mix(vec3(0.2, 1.0, 0.55), vec3(0.62, 0.3, 1.0), smoothstep(0.25, 1.0, vUv.y));
  float k = wave * fade * uStrength;
  gl_FragColor = vec4(col * k, k);
}
`,
};

function Aurora({ ctl }: { ctl: SkyController }) {
  const m = useShader(
    auroraShader,
    { uTime: { value: 0 }, uStrength: { value: 0 } },
    {
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }
  );
  useFrame((state) => {
    m.uniforms.uTime.value = state.clock.elapsedTime;
    const goal = ctl.aurora ? (ctl.lightOn ? 0.7 : 1.1) : 0;
    m.uniforms.uStrength.value += (goal - m.uniforms.uStrength.value) * 0.05;
  });
  return (
    <group>
      <mesh position={[0, 1.08, 0]} material={m} renderOrder={3}>
        <cylinderGeometry args={[0.9, 0.6, 0.56, 72, 1, true]} />
      </mesh>
      <mesh position={[0, 1.2, 0]} material={m} renderOrder={3} rotation={[0, 1.3, 0]}>
        <cylinderGeometry args={[1.05, 0.7, 0.7, 72, 1, true]} />
      </mesh>
    </group>
  );
}

/** Winzige Stadtlichter: nur an Land, nur auf der Nachtseite (bei Licht aus überall) */
const cityShader = {
  vertex: /* glsl */ `
varying vec3 vObj;
varying vec3 vN;
varying vec3 vWorld;
void main() {
  vObj = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`,
  fragment: /* glsl */ `
#define PI 3.14159265
uniform sampler2D uMap;
uniform vec3 uLamp;
uniform float uNight;
varying vec3 vObj;
varying vec3 vN;
varying vec3 vWorld;
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x), mix(hash2(i + vec2(0.0, 1.0)), hash2(i + 1.0), f.x), f.y);
}
void main() {
  vec3 p = normalize(vObj);
  vec2 uv = vec2(atan(p.z, p.x) / (2.0 * PI) + 0.5, asin(clamp(p.y, -1.0, 1.0)) / PI + 0.5);
  vec3 col = texture2D(uMap, uv).rgb;
  // Land: mehr Rot/Grün als Blau, Eiskappen ausgenommen
  float land = smoothstep(-0.02, 0.04, max(col.r, col.g) - col.b);
  land *= 1.0 - smoothstep(0.7, 0.8, min(col.r, min(col.g, col.b)));
  // Städte in Grüppchen, jede ein einzelner Lichtpunkt
  vec2 g = uv * vec2(110.0, 55.0);
  vec2 cell = floor(g);
  float h = hash2(cell);
  vec2 c = fract(g) - 0.5 - (vec2(hash2(cell + 3.1), hash2(cell + 7.7)) - 0.5) * 0.5;
  float spot = (h > 0.55 ? 1.0 : 0.0) * (1.0 - smoothstep(0.05, 0.32, length(c))) * (0.5 + 0.5 * hash2(cell + 2.0));
  float cluster = smoothstep(0.35, 0.6, vnoise(uv * vec2(14.0, 7.0)));
  float sun = dot(normalize(vN), normalize(uLamp - vWorld));
  float night = max(1.0 - smoothstep(-0.25, 0.15, sun), uNight);
  float k = spot * land * cluster * night;
  gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * k * 3.0, k);
}
`,
};

/** Erde aus Pappmaché mit Mond, in der Mitte von allem */
function Earth({ layout, ctl }: { layout: Layout; ctl: SkyController }) {
  const earth = getPlanet('erde')!;
  const sf = earth.scene.surface;
  const spin = useRef<THREE.Group>(null);
  const moon = useRef<THREE.Mesh>(null);
  const moonAngle = useRef(0.9);
  const m = useShader(papierShader, {
    uMap: { value: placeholder },
    uLamp: { value: lampOf(layout) },
    uEmissive: { value: 0.3 },
    uBright: { value: 1 },
    uFlat: { value: 0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uTintAmt: { value: 0 },
    uKnit: { value: 0 },
    uStitch: { value: 1 },
    uBoil: { value: 0 },
  });
  useBake([
    {
      material: m,
      key: 'sternenkasten-erde',
      defines: {
        KIND: kindIndex[sf.kind],
        ...(sf.spot ? { HAS_SPOT: '' } : {}),
        ...(sf.polarCaps ? { HAS_CAPS: '' } : {}),
      },
      uniforms: () => surfaceUniforms(sf, earth.id.length * 1.37 + earth.scene.orbitRadius),
    },
  ]);
  const moonMat = useShader(flatToonShader, {
    uColor: { value: srgb('#CFCBC2') },
    uLamp: { value: lampOf(layout) },
    uBright: { value: 1 },
    uFlat: { value: 0 },
  });
  const outline = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#120E0A', side: THREE.BackSide }),
    []
  );
  const city = useShader(
    cityShader,
    { uMap: { value: placeholder }, uLamp: { value: lampOf(layout) }, uNight: { value: 0 } },
    { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }
  );
  useFrame((state, dt) => {
    // Standbild: Erde und Mond halten still, außer „idle“ ist an
    // Animation: der Mond zieht langsam seine Bahn, sonst steht er still
    moonAngle.current += dt * 0.35 * ctl.spinF;
    const t = moonAngle.current;
    moon.current?.position.set(Math.cos(t) * 1.75, Math.sin(t) * 0.18, Math.sin(t) * 1.75);
    city.uniforms.uMap.value = m.uniforms.uMap.value;
    city.uniforms.uNight.value += ((ctl.lightOn ? 0 : 1) - city.uniforms.uNight.value) * 0.06;
    const on = ctl.lightOn;
    m.uniforms.uBright.value = on ? 1 : 0;
    m.uniforms.uEmissive.value = on ? 0.3 : 0;
    moonMat.uniforms.uBright.value = on ? 1 : 0;
  });
  return (
    <group>
      <group rotation={[0, 0, (23.4 * Math.PI) / 180]}>
        <group ref={spin} rotation={[0, 2.4, 0]}>
          <mesh material={m}>
            <sphereGeometry args={[1, isWeb ? 48 : 36, isWeb ? 32 : 24]} />
          </mesh>
          <mesh material={outline} scale={1.04}>
            <sphereGeometry args={[1, 28, 20]} />
          </mesh>
          <mesh material={city} scale={1.004} renderOrder={2}>
            <sphereGeometry args={[1, isWeb ? 48 : 36, isWeb ? 32 : 24]} />
          </mesh>
        </group>
        <Aurora ctl={ctl} />
      </group>
      <mesh ref={moon} material={moonMat}>
        <sphereGeometry args={[0.27, 24, 16]} />
      </mesh>
    </group>
  );
}

/* ---------- Himmel auf die Kartonwände gemalt ---------- */

function flatPlacement(
  c: Constellation,
  origin: THREE.Vector3,
  right: THREE.Vector3,
  up: THREE.Vector3,
  s: number
): Placement {
  const stars = c.stars.map(([x, y]) =>
    origin.clone().addScaledVector(right, x * s).addScaledVector(up, y * s)
  );
  return { c, stars, center: origin.clone(), axes: { r: right, u: up } };
}

/** Alle Sternbilder flach verteilt auf Rückwand, Seiten, Decke und Boden */
function wallPlacements({ W, H, D }: Layout, list: Constellation[] = constellations): Placement[] {
  const s = Math.min(W, H) * 0.062;
  const e = 0.03;
  const X = new THREE.Vector3(1, 0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  const nZ = Z.clone().negate();
  // Fläche: Mitte, Achse rechts mit Länge, Achse oben mit Länge, Raster, Maßstab
  const faces: {
    o: THREE.Vector3;
    r: THREE.Vector3;
    lr: number;
    u: THREE.Vector3;
    lu: number;
    cols: number;
    rows: number;
    k: number;
    skipMiddle?: boolean;
  }[] = [
    { o: new THREE.Vector3(0, 0, -D / 2 + e), r: X, lr: W, u: Y, lu: H, cols: 4, rows: 3, k: 1, skipMiddle: true },
    { o: new THREE.Vector3(-W / 2 + e, 0, 0), r: Z, lr: D, u: Y, lu: H, cols: 3, rows: 2, k: 0.85 },
    { o: new THREE.Vector3(W / 2 - e, 0, 0), r: nZ, lr: D, u: Y, lu: H, cols: 3, rows: 2, k: 0.85 },
    { o: new THREE.Vector3(0, H / 2 - e, 0), r: X, lr: W, u: Z, lu: D, cols: 3, rows: 2, k: 0.85 },
    { o: new THREE.Vector3(0, -H / 2 + e, 0), r: X, lr: W, u: nZ, lu: D, cols: 3, rows: 2, k: 0.85 },
  ];
  const jitter = (n: number) => ((Math.sin(n * 12.9898) * 43758.5453) % 1) * 0.08;
  const spots: [THREE.Vector3, THREE.Vector3, THREE.Vector3, number][] = [];
  faces.forEach((f, fi) => {
    for (let row = 0; row < f.rows; row++)
      for (let col = 0; col < f.cols; col++) {
        // Rückwand: die beiden Plätze direkt hinter der Erde frei lassen
        if (f.skipMiddle && row === 1 && (col === 1 || col === 2)) continue;
        const n = fi * 31 + row * 7 + col;
        const a = ((col + 0.5) / f.cols - 0.5) * 0.86 + jitter(n);
        const b = ((row + 0.5) / f.rows - 0.5) * 0.82 + jitter(n + 5);
        const o = f.o.clone().addScaledVector(f.r, a * f.lr).addScaledVector(f.u, -b * f.lu);
        spots.push([o, f.r, f.u, f.k]);
      }
  });
  // Tierkreis und andere Sternbilder abwechselnd, damit es sich mischt
  const famousList = list.filter((c) => !c.zodiac);
  const zodiacList = list.filter((c) => c.zodiac);
  const mixed: Constellation[] = [];
  for (let i = 0; i < Math.max(famousList.length, zodiacList.length); i++) {
    if (famousList[i]) mixed.push(famousList[i]);
    if (zodiacList[i]) mixed.push(zodiacList[i]);
  }
  // Gleichmäßig über alle Plätze verteilen, auch wenn es weniger Sternbilder sind
  const used = mixed.slice(0, spots.length);
  return used.map((c, i) => {
    const [o, r, u, k] = spots[Math.floor((i * spots.length) / used.length)];
    return flatPlacement(c, o, r, u, s * k);
  });
}

/** Himmelskugel, auf die die Wandsterne im Animationsmodus fliegen */
const SKY_R = 6.2;

/** Was an die Wände kommt: alles, was nicht schon auf Kuppel oder Ring sitzt */
function wallList(style: SkyStyle) {
  if (style === 'dome') return zodiac;
  if (style === 'ring') return famous;
  return constellations;
}

function WallSky({ layout, style, ctl }: { layout: Layout; style: SkyStyle; ctl: SkyController }) {
  const places = useMemo(() => wallPlacements(layout, wallList(style)), [layout, style]);
  const flights = useMemo(() => {
    const k = Math.min(layout.W, layout.H) / 8;
    return places.map((p, i) => {
      const dir = p.center.clone().normalize();
      const base = dir.clone().multiplyScalar(SKY_R);
      const to = p.stars.map((v) =>
        v.clone().sub(p.center).multiplyScalar(0.8 / k).add(base).normalize().multiplyScalar(SKY_R)
      );
      // Gestaffelt: nicht alle auf einmal, sondern wie ein Schwarm
      const delay = ((i * 7) % places.length) / places.length * 0.45;
      return { to, delay };
    });
  }, [places, layout]);
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    if (group.current) group.current.visible = ctl.show.walls;
  });
  return (
    <group ref={group}>
      {places.map((p, i) => (
        <ConstellationMesh
          key={p.c.id}
          place={p}
          ctl={ctl}
          tag="wall"
          variant="hole"
          fly={flights[i]}
        />
      ))}
    </group>
  );
}

/** Dichter Sternenstaub entlang der Milchstraße auf der Rückwand; das Band selbst malt der Wand-Shader */
function MilkyWay({ layout, ctl }: { layout: Layout; ctl: SkyController }) {
  const { W, H, D } = layout;
  const n = 380;
  const ref = useRef<THREE.InstancedMesh>(null);
  const dustMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#F4EFE4', transparent: true, opacity: 0.5 }),
    []
  );
  const home = useMemo(() => [] as { p: THREE.Vector3; s: number }[], []);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    home.length = 0;
    let seed = 17;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n; i++) {
      const x = (rnd() - 0.5) * W;
      const px = (2 * x) / H;
      // Gauß-ähnlich um die Bandmitte
      const g = (rnd() + rnd() + rnd() - 1.5) * 0.45;
      const y = (H / 2) * (0.45 * px + g * 0.6);
      const p = new THREE.Vector3(x, Math.max(-H / 2 + 0.1, Math.min(H / 2 - 0.1, y)), -D / 2 + 0.02);
      home.push({ p, s: 0.012 + rnd() * 0.022 });
      tmp.position.copy(p);
      tmp.scale.setScalar(home[i].s);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [W, H, D, home]);
  const moved = useRef(false);
  useFrame(() => {
    const on = (ctl.show.milky ? 1 : 0) * (1 - 0.75 * ease(ctl.animT));
    dustMat.opacity += ((ctl.lightOn ? 0.45 : 0.95) * on - dustMat.opacity) * 0.08;
    const mesh = ref.current;
    const active = Math.abs(ctl.projAngle) > 1e-4;
    if (!mesh || (!active && !moved.current)) return;
    projectInstances(mesh, home, ctl, true);
    moved.current = active;
  });
  return <instancedMesh ref={ref} args={[starGeo, dustMat, n]} frustumCulled={false} />;
}

/* ---------- Die anderen Planeten als Papierkreise ---------- */

/** Bastelgrößen: Reihenfolge stimmt, Verhältnisse nicht */
const MINI_R: Record<string, number> = {
  merkur: 0.11, venus: 0.16, mars: 0.13, jupiter: 0.32, saturn: 0.27, uranus: 0.2, neptun: 0.2,
};
/** Im Animationsmodus kreisen sie auf der Ekliptik um die Erde */
const ECLIPTIC_R = 4.2;

const camQ = new THREE.Quaternion();
const projPos = new THREE.Vector3();
/** Ausrichtung eines Papierkreises je Kartonfläche (Index wie projectOnBox) */
const FACE_Q: Record<number, THREE.Quaternion> = {
  0: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)),
  1: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)),
  2: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
  3: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)),
  4: new THREE.Quaternion(),
};

function PaperPlanet({
  planet,
  index,
  wallPos,
  wallQ,
  layout,
  ctl,
}: {
  planet: Planet;
  index: number;
  wallPos: THREE.Vector3;
  wallQ: THREE.Quaternion;
  layout: Layout;
  ctl: SkyController;
}) {
  const r = (MINI_R[planet.id] ?? 0.15) * ctl.k;
  const body = useShader(flatToonShader, {
    uColor: { value: srgb(planet.scene.surface.colors[0]) },
    uLamp: { value: lampOf(layout) },
    uBright: { value: 1 },
    uFlat: { value: 0 },
  });
  const paper = useMemo(() => new THREE.MeshBasicMaterial({ color: '#F4EFE4' }), []);
  const ringMat = useMemo(
    () =>
      planet.scene.rings
        ? new THREE.MeshBasicMaterial({ color: planet.scene.rings.colors[0], side: THREE.DoubleSide })
        : null,
    [planet]
  );
  useEffect(() => () => {
    paper.dispose();
    ringMat?.dispose();
  }, [paper, ringMat]);
  const group = useRef<THREE.Group>(null);
  const live = useMemo(() => new THREE.Vector3(), []);
  const to = useMemo(() => {
    const a = (index / 7) * Math.PI * 2 + 0.4;
    return new THREE.Vector3(Math.cos(a) * ECLIPTIC_R, 0, Math.sin(a) * ECLIPTIC_R);
  }, [index]);
  useEffect(() => {
    ctl.planetSpots[planet.id] = { live, name: planet.name };
    return () => {
      delete ctl.planetSpots[planet.id];
    };
  }, [ctl, planet, live]);
  const dim = useMemo(() => new THREE.Color('#4A4A58'), []);
  const bright = useMemo(() => new THREE.Color('#F4EFE4'), []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.visible = ctl.show.planets;
    const t = ctl.reduceMotion ? (ctl.animT > 0.5 ? 1 : 0) : ease((ctl.animT - 0.3 - index * 0.04) / 0.5);
    tmpV.copy(to).applyMatrix4(ctl.skyMatrix);
    // Planetarium: auf der Wand mitgleiten, Fläche bestimmt die Ausrichtung
    let fromQ = wallQ;
    let shown = true;
    if (Math.abs(ctl.projAngle) > 1e-4 && t === 0) {
      const f = projectOnBox(wallPos, ctl, projPos, 0.035);
      fromQ = FACE_Q[f] ?? wallQ;
      shown = f !== -1;
    } else projPos.copy(wallPos);
    g.position.lerpVectors(projPos, tmpV, t);
    g.position.z += Math.sin(Math.PI * t) * 0.7 * ctl.k;
    if (ctl.camera) camQ.copy(ctl.camera.quaternion);
    g.quaternion.slerpQuaternions(fromQ, camQ, t);
    g.scale.setScalar(shown ? 1 : 0);
    live.copy(g.position);
    const sel = ctl.selectedKind === 'planet' && ctl.selectedId === planet.id;
    body.uniforms.uBright.value = ctl.lightOn || sel ? 1 : 0;
    paper.color.lerp(sel ? bright : ctl.lightOn ? bright : dim, 0.12);
  });
  return (
    <group ref={group}>
      <mesh position={[0, 0, -0.006]} material={paper}>
        <circleGeometry args={[r * 1.14, 36]} />
      </mesh>
      <mesh material={body}>
        <circleGeometry args={[r, 36]} />
      </mesh>
      {ringMat && (
        <group rotation={[0, 0, 0.35]} scale={[1, 0.36, 1]}>
          <mesh position={[0, 0, 0.004]} material={ringMat}>
            <ringGeometry args={[r * 1.35, r * 2.05, 48]} />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** Ausgeschnitten und an die Seitenwände geklebt, entlang einer gestrichelten Ekliptik */
function PaperPlanets({ layout, ctl }: { layout: Layout; ctl: SkyController }) {
  const { W, H, D } = layout;
  const others = planets.filter((p) => p.id !== 'erde');
  const spots = useMemo(() => {
    const e = 0.035;
    const left = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    const right = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0));
    // Innen nach außen: links vorne nach hinten, dann rechts hinten nach vorne
    const zs = [0.3, 0.05, -0.22, -0.3, -0.05, 0.18, 0.36];
    return others.map((_, i) => {
      const onLeft = i < 3;
      const z = zs[i] * D;
      const y = -0.04 * H + Math.sin(i * 1.3) * 0.05 * H;
      return {
        pos: new THREE.Vector3(onLeft ? -W / 2 + e : W / 2 - e, y, z),
        q: onLeft ? left : right,
      };
    });
  }, [W, H, D, others.length]);
  const lineGeo = useMemo(() => {
    const pts: number[] = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 24; i++) {
        const z0 = (-0.45 + (i / 24) * 0.9) * D;
        const z1 = (-0.45 + ((i + 1) / 24) * 0.9) * D;
        pts.push(side * (W / 2 - 0.03), -0.04 * H, z0, side * (W / 2 - 0.03), -0.04 * H, z1);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [W, H, D]);
  const lineMat = useMemo(
    () => new THREE.LineDashedMaterial({ color: '#F2D15C', dashSize: 0.08, gapSize: 0.08, transparent: true, opacity: 0.5 }),
    []
  );
  const line = useRef<THREE.LineSegments>(null);
  useLayoutEffect(() => {
    line.current?.computeLineDistances();
  }, [lineGeo]);
  useFrame(() => {
    if (line.current) line.current.visible = ctl.show.planets;
    lineMat.opacity = 0.5 * (1 - ease(ctl.animT)) * (1 - ctl.pT);
  });
  return (
    <group>
      <lineSegments ref={line} geometry={lineGeo} material={lineMat} />
      {others.map((p, i) => (
        <PaperPlanet
          key={p.id}
          planet={p}
          index={i}
          wallPos={spots[i].pos}
          wallQ={spots[i].q}
          layout={layout}
          ctl={ctl}
        />
      ))}
    </group>
  );
}

/* ---------- Sternschnuppen ---------- */

/** Meteorstrom → Sternbild, aus dem die Schnuppen zu kommen scheinen */
export const SHOWERS = {
  perseiden: 'perseus',
  leoniden: 'loewe',
  geminiden: 'zwillinge',
  lyriden: 'leier',
} as const;

const meteorShader = {
  vertex: /* glsl */ `
attribute vec3 aStart;
attribute vec3 aDir;
attribute vec3 aSide;
attribute vec4 aP;
attribute vec2 aQ;
attribute float aHue;
uniform float uTime;
uniform float uWidth;
varying vec2 vQ;
varying float vLife;
varying float vHue;
void main() {
  // aP: Versatz, Takt in s, Schweiflänge, Flugstrecke
  float t = mod(uTime + aP.x, aP.y);
  float dur = 0.85;
  float p = clamp(t / dur, 0.0, 1.0);
  float alive = 1.0 - step(dur, t);
  float headD = aP.w * (1.0 - (1.0 - p) * (1.0 - p));
  float len = aP.z * smoothstep(0.0, 0.3, p) * (1.0 - 0.5 * smoothstep(0.7, 1.0, p));
  float isHead = step(1.0, aQ.x);
  float along = mix(headD - len * (1.0 - aQ.x), headD + (aQ.x - 1.0) * uWidth * 8.0, isHead);
  float w = uWidth * mix(mix(0.12, 1.0, aQ.x), 2.4, isHead);
  vec3 pos = aStart + aDir * along + aSide * aQ.y * w;
  vQ = aQ;
  vLife = alive * smoothstep(0.0, 0.08, p) * (1.0 - smoothstep(0.75, 1.0, p));
  vHue = aHue;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`,
  fragment: /* glsl */ `
uniform float uStrength;
varying vec2 vQ;
varying float vLife;
varying float vHue;
void main() {
  float x = vQ.x;
  float y = vQ.y;
  float xt = clamp(x, 0.0, 1.0);
  // Schweif: nach hinten dünner und blasser, quer weich
  float tail = exp(-y * y * 7.0) * pow(xt, 2.2) * (1.0 - step(1.0, x));
  float spark = exp(-y * y * 40.0) * pow(xt, 6.0) * 1.2;
  // Kopf: runder Glutpunkt mit Hof
  float hx = (x - 1.0) * 10.0;
  float head = exp(-(hx * hx * 1.6 + y * y * 1.6)) * 1.6;
  vec3 hot = vec3(1.0, 0.98, 0.92);
  vec3 trail = mix(vec3(0.5, 1.0, 0.72), vec3(1.0, 0.68, 0.38), vHue);
  vec3 col = mix(trail, hot, pow(xt, 3.0));
  float k = (tail + spark + head) * vLife * uStrength;
  gl_FragColor = vec4(col * k, k);
}
`,
};

/**
 * Echte Sternschnuppen: schießen nacheinander strahlenförmig aus dem
 * Sternbild an der Wand. Glühender Kopf, verglühender Schweif, mal grünlich
 * (Magnesium), mal orange (Natrium).
 */
function MeteorShower({
  flag,
  layout,
  ctl,
}: {
  flag: keyof typeof SHOWERS;
  layout: Layout;
  ctl: SkyController;
}) {
  const place = useMemo(
    () => wallPlacements(layout).find((p) => p.c.id === SHOWERS[flag]),
    [layout, flag]
  );
  const unit = Math.min(layout.W, layout.H) / 8;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    if (!place?.axes) return g;
    const { r, u } = place.axes;
    const normal = new THREE.Vector3().crossVectors(r, u).normalize();
    if (normal.dot(place.center.clone().negate()) < 0) normal.negate();
    const n = 9;
    const xs = [0, 1, 1.1];
    const ys = [-1, 1];
    const per = xs.length * ys.length;
    const attr = {
      aStart: new Float32Array(n * per * 3),
      aDir: new Float32Array(n * per * 3),
      aSide: new Float32Array(n * per * 3),
      aP: new Float32Array(n * per * 4),
      aQ: new Float32Array(n * per * 2),
      aHue: new Float32Array(n * per),
      position: new Float32Array(n * per * 3),
    };
    const index: number[] = [];
    let seed = flag.length * 131 + 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let m = 0; m < n; m++) {
      const a = (m / n) * Math.PI * 2 + rnd() * 0.5;
      const dir = r.clone().multiplyScalar(Math.cos(a)).addScaledVector(u, Math.sin(a)).normalize();
      const side = new THREE.Vector3().crossVectors(normal, dir).normalize();
      const start = place.center
        .clone()
        .addScaledVector(normal, 0.06 + rnd() * 0.04)
        .addScaledVector(dir, (0.35 + rnd() * 0.35) * unit);
      const period = 2.6 + rnd() * 4.5;
      const params = [rnd() * period, period, (0.55 + rnd() * 0.6) * unit, (1.1 + rnd() * 1.3) * unit];
      const hue = rnd();
      xs.forEach((x, xi) =>
        ys.forEach((y, yi) => {
          const v = m * per + xi * ys.length + yi;
          attr.aStart.set(start.toArray(), v * 3);
          attr.position.set(start.toArray(), v * 3);
          attr.aDir.set(dir.toArray(), v * 3);
          attr.aSide.set(side.toArray(), v * 3);
          attr.aP.set(params, v * 4);
          attr.aQ.set([x, y], v * 2);
          attr.aHue[v] = hue;
        })
      );
      for (let xi = 0; xi < xs.length - 1; xi++) {
        const a0 = m * per + xi * 2;
        index.push(a0, a0 + 2, a0 + 1, a0 + 1, a0 + 2, a0 + 3);
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(attr.position, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(attr.aStart, 3));
    g.setAttribute('aDir', new THREE.BufferAttribute(attr.aDir, 3));
    g.setAttribute('aSide', new THREE.BufferAttribute(attr.aSide, 3));
    g.setAttribute('aP', new THREE.BufferAttribute(attr.aP, 4));
    g.setAttribute('aQ', new THREE.BufferAttribute(attr.aQ, 2));
    g.setAttribute('aHue', new THREE.BufferAttribute(attr.aHue, 1));
    g.setIndex(index);
    // Die Schnuppen fliegen im Shader, die Box muss den ganzen Weg abdecken
    g.boundingSphere = new THREE.Sphere(place.center.clone(), 4 * unit);
    return g;
  }, [place, flag, unit]);
  const m = useShader(
    meteorShader,
    { uTime: { value: 0 }, uWidth: { value: 0.03 * unit }, uStrength: { value: 0 } },
    {
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }
  );
  useEffect(() => () => geo.dispose(), [geo]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    m.uniforms.uTime.value = state.clock.elapsedTime;
    m.uniforms.uWidth.value = 0.03 * unit;
    const goal = (ctl.show[flag] ? (ctl.lightOn ? 0.85 : 1.25) : 0) * (1 - ctl.pT);
    m.uniforms.uStrength.value += (goal - m.uniforms.uStrength.value) * 0.08;
    if (ref.current) ref.current.visible = m.uniforms.uStrength.value > 0.01;
  });
  return <mesh ref={ref} geometry={geo} material={m} renderOrder={3} frustumCulled={false} />;
}

function MeteorShowers({ layout, ctl }: { layout: Layout; ctl: SkyController }) {
  return (
    <group>
      {(Object.keys(SHOWERS) as (keyof typeof SHOWERS)[]).map((f) => (
        <MeteorShower key={f} flag={f} layout={layout} ctl={ctl} />
      ))}
    </group>
  );
}

const TILT = (23.4 * Math.PI) / 180;

/**
 * Taktgeber für den Animationsmodus: Übergang in etwa 4 Sekunden, danach
 * dreht sich der Himmel einmal in 90 Sekunden um die Erdachse.
 */
function Animator({ ctl }: { ctl: SkyController }) {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const goal = ctl.anim ? 1 : 0;
    const step = ctl.reduceMotion ? 1 : dt / 4;
    ctl.animT += Math.max(-step, Math.min(step, goal - ctl.animT));
    const pStep = ctl.reduceMotion ? 1 : dt / 1.5;
    const pGoal = ctl.planetarium ? 1 : 0;
    ctl.pT += Math.max(-pStep, Math.min(pStep, pGoal - ctl.pT));
    const spinGoal = (ctl.anim && ctl.animT > 0.6) || ctl.planetarium ? 1 : 0;
    ctl.spinF += (spinGoal - ctl.spinF) * Math.min(1, dt * 0.8);
    const speed = ((Math.PI * 2) / 90) * (ctl.reduceMotion ? 0.25 : 1);
    ctl.skyAngle += dt * speed * ctl.spinF;
    if (ctl.planetarium) ctl.projAngle += dt * speed * ctl.spinF;
    else if (ctl.projAngle !== 0) {
      // Zurück zum Standbild: weich nach Hause gleiten, auf dem kürzesten Weg
      const home = Math.round(ctl.projAngle / (Math.PI * 2)) * Math.PI * 2;
      const d = home - ctl.projAngle;
      ctl.projAngle = Math.abs(d) < 1e-4 ? 0 : ctl.projAngle + d * Math.min(1, dt * 1.2);
      if (ctl.projAngle !== 0 && Math.abs(home - ctl.projAngle) < 1e-4) ctl.projAngle = 0;
    }
    if (Math.abs(ctl.projAngle) > Math.PI * 200) ctl.projAngle %= Math.PI * 2;
    updateProjection(ctl);
  });
  return null;
}

/** Alles, was sich beim Ziehen mitdreht */
function Content({ style, layout, ctl }: { style: SkyStyle; layout: Layout; ctl: SkyController }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const sky = useRef<THREE.Group>(null);
  const deco = useRef<THREE.Group>(null);
  const places = useMemo(
    () =>
      style === 'dome' ? domePlacements() : style === 'ring' ? ringPlacements() : [],
    [style]
  );
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (!ctl.dragging) {
      ctl.yaw += (ctl.idle ? 0.06 : 0) * dt + ctl.vyaw * dt;
      ctl.vyaw *= 0.94;
    }
    group.current?.rotation.set(ctl.pitch, ctl.yaw, 0);
    if (group.current) ctl.axisWorld.set(-Math.sin(TILT), Math.cos(TILT), 0).applyEuler(group.current.rotation);
    // Himmel öffnen: Glas und Messing schrumpfen weg, ihre Sterne wandern nach außen
    if (deco.current) {
      const sc = 1 - ease(Math.min(1, ctl.animT * 2.5));
      deco.current.scale.setScalar(Math.max(sc, 0.001));
      deco.current.visible = sc > 0.01;
    }
    // Alles dreht sich gemeinsam um die schräge Erdachse
    if (spin.current) spin.current.rotation.y = ctl.skyAngle;
    if (sky.current) {
      sky.current.updateMatrixWorld(true);
      ctl.skyMatrix.copy(sky.current.matrixWorld);
    }
  });
  return (
    <group scale={ctl.k}>
      <group ref={group}>
        <group rotation={[0, 0, TILT]}>
          <group ref={spin}>
            <group ref={sky} rotation={[0, 0, -TILT]}>
              <Earth layout={layout} ctl={ctl} />
              {style === 'dome' ? (
                <>
                  {places.map((p) => (
                    <ConstellationMesh key={p.c.id} place={p} ctl={ctl} expand={SKY_R / DOME_R} />
                  ))}
                  <group ref={deco}>
                    <Dome ctl={ctl} />
                  </group>
                </>
              ) : style === 'ring' ? (
                <group rotation={[0.38, 0, -0.12]}>
                  <group position={[0, -0.75, 0]}>
                    {places.map((p) => (
                      <ConstellationMesh key={p.c.id} place={p} ctl={ctl} expand={SKY_R / RING_R} />
                    ))}
                    <group ref={deco}>
                      <ZodiacRing ctl={ctl} />
                    </group>
                  </group>
                </group>
              ) : null}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/** Rechnet die Bildschirmposition fürs Namensschild aus */
function Labeler({ ctl }: { ctl: SkyController }) {
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const cam = ctl.camera;
    const id = ctl.selectedId;
    let pos: THREE.Vector3 | null = null;
    if (cam && id) {
      if (ctl.selectedKind === 'planet') pos = ctl.planetSpots[id]?.live ?? null;
      else {
        // Lieber das Wandbild, sonst das auf Kuppel oder Ring
        const wall = ctl.groups[`wall:${id}`];
        const inner = ctl.groups[`inner:${id}`];
        pos = (ctl.show.walls && wall ? wall : inner ?? wall)?.live ?? null;
      }
    }
    if (!cam || !pos) {
      ctl.label.visible = false;
      return;
    }
    if (ctl.labelSV && ctl.labelSV.o.value === 0) {
      ctl.labelSV.o.value = withTiming(1, { duration: 180 });
    }
    v.copy(pos).project(cam);
    ctl.label.x = ((v.x + 1) / 2) * ctl.size.width;
    ctl.label.y = ((1 - v.y) / 2) * ctl.size.height;
    ctl.label.visible = v.z < 1;
    const sv = ctl.labelSV;
    if (sv) {
      sv.x.value = ctl.label.x;
      sv.y.value = ctl.label.y;
    }
  });
  return null;
}

/** Kamera so weit zurück, dass der ganze Kartonrand ins Bild passt */
function Rig({ layout, ctl }: { layout: Layout; ctl: SkyController }) {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const a = size.width / Math.max(1, size.height);
    const tan = Math.tan((cam.fov * Math.PI) / 360);
    const d =
      Math.max((layout.H / 2 + 0.5) / tan, (layout.W / 2 + 0.5) / (tan * a)) + layout.D / 2;
    cam.position.set(0, 0, d);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
    ctl.camera = cam;
    ctl.size = { width: size.width, height: size.height };
  }, [camera, size, layout, ctl]);
  return null;
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    if (++n.current === 3) onReady();
  });
  return null;
}

export function StarBox({
  controller: ctl,
  style,
  onPick,
  labelText,
}: {
  controller: SkyController;
  style: SkyStyle;
  onPick: (p: Pick | null) => void;
  /** Name, der als Schildchen am Gewählten hängt */
  labelText?: string | null;
}) {
  const lx = useSharedValue(0);
  const ly = useSharedValue(0);
  const lo = useSharedValue(0);
  ctl.labelSV = { x: lx, y: ly, o: lo };
  useEffect(() => {
    if (!labelText) lo.value = 0;
  }, [labelText, lo]);
  const labelStyle = useAnimatedStyle(() => ({
    opacity: lo.value,
    transform: [
      { translateX: lx.value - 80 },
      { translateY: ly.value - 58 },
      { scale: 0.94 + 0.06 * lo.value },
    ],
  }));
  const focused = useIsFocused();
  const [aspect, setAspect] = useState(0);
  const [ready, setReady] = useState(false);
  const layout = useMemo(() => (aspect ? layoutFor(aspect) : null), [aspect]);
  if (layout) {
    ctl.k = Math.min(layout.W, layout.H) / 8;
    ctl.box = layout;
  }
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const gesture = useMemo(() => {
    let start = { x: 0, y: 0, t: 0, yaw: 0, pitch: 0 };
    let lastDx = 0;
    let lastT = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        start = {
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
          t: Date.now(),
          yaw: ctl.yaw,
          pitch: ctl.pitch,
        };
        lastDx = 0;
        lastT = start.t;
        ctl.dragging = true;
        ctl.vyaw = 0;
      },
      onPanResponderMove: (_, g) => {
        ctl.yaw = start.yaw + g.dx * 0.008;
        ctl.pitch = Math.max(-0.5, Math.min(0.6, start.pitch + g.dy * 0.006));
        const now = Date.now();
        if (now > lastT) ctl.vyaw = ((g.dx - lastDx) * 0.008 * 1000) / (now - lastT);
        lastDx = g.dx;
        lastT = now;
      },
      onPanResponderRelease: (_, g) => {
        ctl.dragging = false;
        ctl.vyaw = Math.max(-3, Math.min(3, ctl.vyaw));
        if (Math.hypot(g.dx, g.dy) < 6 && Date.now() - start.t < 350) {
          ctl.vyaw = 0;
          onPickRef.current(ctl.pick(start.x, start.y));
        }
      },
      onPanResponderTerminate: () => {
        ctl.dragging = false;
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [ctl]);

  return (
    <View
      style={styles.root}
      onLayout={(e) =>
        setAspect(e.nativeEvent.layout.width / Math.max(1, e.nativeEvent.layout.height))
      }
    >
      {layout && (
        <Canvas
          style={styles.canvas}
          dpr={[1, 1.5]}
          frameloop={focused ? 'always' : 'never'}
          gl={{ antialias: isWeb }}
          camera={{ fov: 38, near: 0.1, far: 200, position: [0, 0, 20] }}
        >
          <color attach="background" args={[color.space]} />
          <Rig layout={layout} ctl={ctl} />
          <Carton layout={layout} ctl={ctl} />
          <StarDust layout={layout} ctl={ctl} />
          <MilkyWay layout={layout} ctl={ctl} />
          <WallSky layout={layout} style={style} ctl={ctl} />
          <PaperPlanets layout={layout} ctl={ctl} />
          <MeteorShowers layout={layout} ctl={ctl} />
          <Animator ctl={ctl} />
          <Content style={style} layout={layout} ctl={ctl} />
          <Labeler ctl={ctl} />
          <FirstFrame onReady={() => setReady(true)} />
        </Canvas>
      )}
      {!ready && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.loader]}>
          <Text style={[type.bodySmall as any, { color: color.textMuted }]}>
            Sterne werden aufgeklebt
          </Text>
        </View>
      )}
      <View
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Sternenkasten mit der Erde in der Mitte. Ziehen zum Drehen, Sternbild antippen für seinen Namen."
        {...gesture.panHandlers}
      />
      {labelText ? (
        <Animated.View pointerEvents="none" style={[styles.tag, labelStyle]}>
          <Text style={styles.tagText} numberOfLines={1}>
            {labelText}
          </Text>
          <View style={styles.tagString} />
          <View style={styles.tagDot} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  canvas: { flex: 1 },
  loader: { alignItems: 'center', justifyContent: 'center', backgroundColor: color.space },
  // Handgeschriebenes Papierschild wie im Schaukasten, mit Faden zum Gewählten
  tag: { position: 'absolute', left: 0, top: 0, width: 160, alignItems: 'center' },
  tagText: {
    ...(type.hand as object),
    fontSize: 20,
    lineHeight: 24,
    paddingHorizontal: 10,
    paddingTop: 2,
    color: '#2A2418',
    backgroundColor: '#F4EFE4',
    borderRadius: 3,
    overflow: 'hidden',
    transform: [{ rotate: '-2deg' }],
    ...Platform.select({
      web: { boxShadow: '0 1px 2px rgba(0,0,0,0.4), 0 6px 14px rgba(0,0,0,0.35)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      },
    }),
  },
  tagString: { width: 1, height: 18, backgroundColor: '#EDE6D6' },
  tagDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EDE6D6', marginTop: -2 },
});

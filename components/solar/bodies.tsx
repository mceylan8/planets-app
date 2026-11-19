import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import * as THREE from 'three';

import { useFrame } from '@/lib/r3f';
import { spinRate } from '@/lib/orbit';
import { color as tokens } from '@/constants/theme';
import { Planet, sun } from '@/constants/planets';
import {
  bakeShader,
  glowShader,
  planetShader,
  ringShader,
  sunShader,
} from './shaders';

export type SpeedRef = { current: number };
export type DaysRef = { current: number };

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** Hex-Farbe als sRGB-Vektor ohne Farbraum-Umrechnung (Shader geben sie 1:1 aus). */
export function srgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(
    ((n >> 16) & 255) / 255,
    ((n >> 8) & 255) / 255,
    (n & 255) / 255
  );
}

export const kindIndex = { rocky: 0, banded: 1, earth: 2 } as const;

const isWeb = Platform.OS === 'web';
/** Kugel-Auflösung: auf Handys etwas gröber, sieht man bei der Größe nicht */
const SEG: [number, number] = isWeb ? [72, 48] : [48, 32];
/** Breite der vorberechneten Oberflächen-Texturen (Höhe = Breite / 2) */
const BAKE_W = isWeb ? 1024 : 768;

/* ---------- Oberflächen einmal vorberechnen ---------- */

type Baked = { target: THREE.WebGLRenderTarget; users: number };
const bakeCache = new WeakMap<THREE.WebGLRenderer, Map<string, Baked>>();

/**
 * Rechnet die prozedurale Oberfläche einmal in eine Textur (pro Renderer
 * gecacht). Danach liest der Planeten-Shader pro Bild nur noch diese Textur.
 */
function bakeSurface(
  gl: THREE.WebGLRenderer,
  key: string,
  defines: Record<string, number | string>,
  uniforms: Record<string, THREE.IUniform>
) {
  let cache = bakeCache.get(gl);
  if (!cache) bakeCache.set(gl, (cache = new Map()));
  const hit = cache.get(key);
  if (hit) {
    hit.users += 1;
    return hit.target.texture;
  }

  const target = new THREE.WebGLRenderTarget(BAKE_W, BAKE_W / 2, {
    depthBuffer: false,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.RepeatWrapping,
  });
  const material = new THREE.ShaderMaterial({
    vertexShader: bakeShader.vertex,
    fragmentShader: bakeShader.fragment,
    defines,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const previous = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.render(scene, camera);
  gl.setRenderTarget(previous);

  material.dispose();
  quad.geometry.dispose();
  cache.set(key, { target, users: 1 });
  return target.texture;
}

/** Gibt eine vorberechnete Textur frei, sobald sie niemand mehr nutzt. */
function releaseSurface(gl: THREE.WebGLRenderer, key: string) {
  const cache = bakeCache.get(gl);
  const entry = cache?.get(key);
  if (!cache || !entry) return;
  entry.users -= 1;
  if (entry.users <= 0) {
    entry.target.dispose();
    cache.delete(key);
  }
}

export function surfaceUniforms(
  sf: Planet['scene']['surface'],
  seed: number
): Record<string, THREE.IUniform> {
  return {
    uA: { value: srgb(sf.colors[0]) },
    uB: { value: srgb(sf.colors[1]) },
    uC: { value: srgb(sf.colors[2]) },
    uBandFreq: { value: sf.bandFreq ?? 10 },
    uBandContrast: { value: sf.bandContrast ?? 0.5 },
    uTurb: { value: sf.turbulence ?? 0.5 },
    uSeed: { value: seed },
    uCaps: { value: sf.polarCaps ?? 0 },
    uSpot: {
      value: sf.spot
        ? new THREE.Vector4(
            sf.spot.lat,
            sf.spot.lon,
            sf.spot.size,
            sf.spot.strength
          )
        : new THREE.Vector4(0, 0, 0, 0),
    },
    uSpotColor: { value: srgb(sf.spot?.color ?? '#000000') },
  };
}

const moonSurface: Planet['scene']['surface'] = {
  kind: 'rocky',
  colors: ['#B9B6B0', '#77746F', '#D6D2CB'],
  rim: '#9A9893',
};

/** Platzhalter, bis die Oberfläche im ersten Frame vorberechnet ist */
export const placeholder = new THREE.DataTexture(
  new Uint8Array([20, 20, 24, 255]),
  1,
  1
);
placeholder.needsUpdate = true;

export type BakeJob = {
  material: THREE.ShaderMaterial;
  key: string;
  defines: Record<string, number | string>;
  uniforms: () => Record<string, THREE.IUniform>;
};

/**
 * Rechnet die Oberflächen im ersten Frame der Render-Schleife vor (nicht
 * während React rendert, das bringt den Zustand von Three.js durcheinander).
 */
export function useBake(jobs: (BakeJob | null)[]) {
  const baked = useRef<{ gl: THREE.WebGLRenderer; keys: string[] } | null>(
    null
  );
  useFrame((state) => {
    if (baked.current) return;
    const keys: string[] = [];
    for (const job of jobs) {
      if (!job) continue;
      job.material.uniforms.uMap.value = bakeSurface(
        state.gl,
        job.key,
        job.defines,
        job.uniforms()
      );
      keys.push(job.key);
    }
    baked.current = { gl: state.gl, keys };
  }, -1);
  useEffect(
    () => () => {
      const b = baked.current;
      if (b) b.keys.forEach((k) => releaseSurface(b.gl, k));
      baked.current = null;
    },
    []
  );
}

function litMaterial(map: THREE.Texture, rim: string, sunPos: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    vertexShader: planetShader.vertex,
    fragmentShader: planetShader.fragment,
    uniforms: {
      uMap: { value: map },
      uRim: { value: srgb(rim) },
      uSunPos: { value: sunPos },
    },
  });
}

type BodyProps = {
  planet: Planet;
  sunPos: THREE.Vector3;
  speed: SpeedRef;
  days: DaysRef;
};

/** Ein Planet mit Achsneigung, Eigenrotation, Ringen und Mond, am Ursprung seiner Gruppe. */
export const PlanetBody = forwardRef<THREE.Mesh, BodyProps>(function PlanetBody(
  { planet, sunPos, speed, days },
  ref
) {
  const s = planet.scene;
  const spinRef = useRef<THREE.Mesh | null>(null);
  const moonRef = useRef<THREE.Mesh>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);

  const material = useMemo(
    () => litMaterial(placeholder, s.surface.rim, sunPos),
    [planet, sunPos]
  );
  const moonMaterial = useMemo(
    () => (s.moon ? litMaterial(placeholder, moonSurface.rim, sunPos) : null),
    [s.moon, sunPos]
  );

  useBake([
    {
      material,
      key: planet.id,
      defines: {
        KIND: kindIndex[s.surface.kind],
        ...(s.surface.spot ? { HAS_SPOT: '' } : {}),
        ...(s.surface.polarCaps ? { HAS_CAPS: '' } : {}),
      },
      uniforms: () =>
        surfaceUniforms(s.surface, planet.id.length * 1.37 + s.orbitRadius),
    },
    moonMaterial && {
      material: moonMaterial,
      key: 'mond',
      defines: { KIND: 0 },
      uniforms: () => surfaceUniforms(moonSurface, 4.2),
    },
  ]);

  const ringMaterial = useMemo(() => {
    if (!s.rings) return null;
    return new THREE.ShaderMaterial({
      vertexShader: ringShader.vertex,
      fragmentShader: ringShader.fragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uInner: { value: s.radius * s.rings.inner },
        uOuter: { value: s.radius * s.rings.outer },
        uA: { value: srgb(s.rings.colors[0]) },
        uB: { value: srgb(s.rings.colors[1]) },
        uSunPos: { value: sunPos },
        uPlanetPos: { value: new THREE.Vector3() },
        uPlanetR: { value: s.radius },
      },
    });
  }, [s.rings, s.radius, sunPos]);

  useEffect(
    () => () => {
      material.dispose();
      moonMaterial?.dispose();
      ringMaterial?.dispose();
    },
    [material, moonMaterial, ringMaterial]
  );

  useFrame((_, dt) => {
    const mesh = spinRef.current;
    if (!mesh) return;
    mesh.rotation.y += dt * spinRate(planet) * Math.min(speed.current, 1.6);
    if (ringMaterial) {
      mesh.getWorldPosition(worldPos);
      ringMaterial.uniforms.uPlanetPos.value.copy(worldPos);
    }
    if (moonRef.current && s.moon) {
      const a = (days.current / s.moon.periodDays) * TAU;
      moonRef.current.position.set(
        Math.cos(a) * s.moon.distance,
        0,
        -Math.sin(a) * s.moon.distance
      );
    }
  });

  return (
    <group>
      <group rotation={[0, 0, s.tiltDeg * DEG]}>
        <mesh
          ref={(m) => {
            spinRef.current = m;
            if (typeof ref === 'function') ref(m);
            else if (ref) ref.current = m;
          }}
          material={material}
        >
          <sphereGeometry args={[s.radius, SEG[0], SEG[1]]} />
        </mesh>
        {ringMaterial && s.rings && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            material={ringMaterial}
            renderOrder={1}
          >
            <ringGeometry
              args={[
                s.radius * s.rings.inner,
                s.radius * s.rings.outer,
                isWeb ? 192 : 128,
                1,
              ]}
            />
          </mesh>
        )}
      </group>
      {moonMaterial && s.moon && (
        <mesh ref={moonRef} material={moonMaterial}>
          <sphereGeometry args={[s.moon.radius, 32, 24]} />
        </mesh>
      )}
    </group>
  );
});

/** Sonne: körnige Oberfläche mit Randverdunklung und ein Schein, der zur Kamera zeigt. */
export function Sun() {
  const glowRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const core = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: sunShader.vertex,
        fragmentShader: sunShader.fragment,
        uniforms: { uMap: { value: placeholder } },
      }),
    []
  );
  useBake([
    {
      material: core,
      key: 'sonne',
      defines: { KIND: 3 },
      uniforms: () => surfaceUniforms(moonSurface, 0),
    },
  ]);
  const glow = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glowShader.vertex,
        fragmentShader: glowShader.fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: srgb('#FFB04A') },
          uIntensity: { value: 0.9 },
        },
      }),
    []
  );

  useEffect(
    () => () => {
      core.dispose();
      glow.dispose();
    },
    [core, glow]
  );

  useFrame((state, dt) => {
    // Sonne dreht sich langsam, damit die Oberfläche lebt
    if (coreRef.current) coreRef.current.rotation.y += dt * 0.03;
    glowRef.current?.quaternion.copy(state.camera.quaternion);
  });

  return (
    <group>
      <mesh ref={coreRef} material={core}>
        <sphereGeometry args={[sun.radius, SEG[0], SEG[1]]} />
      </mesh>
      <mesh ref={glowRef} material={glow} renderOrder={2}>
        <planeGeometry args={[sun.radius * 7, sun.radius * 7]} />
      </mesh>
    </group>
  );
}

/** Sternenhimmel als Punkte auf einer großen Kugel. */
export function Stars({
  count = isWeb ? 1800 : 900,
  radius = 420,
}: {
  count?: number;
  radius?: number;
}) {
  const object = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const t = rand() * TAU;
      const r = Math.sqrt(1 - u * u);
      pos.set(
        [Math.cos(t) * r * radius, u * radius, Math.sin(t) * r * radius],
        i * 3
      );
      const b = 0.25 + Math.pow(rand(), 3) * 0.75;
      const warm = rand();
      col.set(
        [b, b * (0.92 + warm * 0.08), b * (0.85 + (1 - warm) * 0.15)],
        i * 3
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.6,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    return new THREE.Points(geo, mat);
  }, [count, radius]);

  useEffect(
    () => () => {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    },
    [object]
  );

  return <primitive object={object} />;
}

/** Bahnlinie als Kreis. Die ausgewählte Bahn leuchtet im Akzent. */
export function OrbitLine({
  radius,
  active,
}: {
  radius: number;
  active: boolean;
}) {
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const seg = 256;
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * TAU;
      pts.push(
        new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius)
      );
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      transparent: true,
      depthWrite: false,
    });
    return new THREE.LineLoop(geo, mat);
  }, [radius]);

  useEffect(() => {
    const mat = line.material as THREE.LineBasicMaterial;
    mat.color.set(active ? tokens.accentLine : '#FFFFFF');
    mat.opacity = active ? 0.55 : 0.1;
  }, [line, active]);

  useEffect(
    () => () => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    },
    [line]
  );

  return <primitive object={line} />;
}

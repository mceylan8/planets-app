import React, { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Platform, StyleSheet, View } from 'react-native';
import * as THREE from 'three';

import { Canvas, useThree } from '@/lib/r3f';
import { color } from '@/constants/theme';
import { Body, isPlanet } from '@/constants/planets';
import { PlanetBody, Stars, Sun } from './bodies';

/** true, sobald laufende Übergänge fertig sind. Shader-Kompilieren blockiert sonst die Animation. */
function useAfterTransition() {
  const [ok, setOk] = useState(Platform.OS === 'web');
  useEffect(() => {
    if (ok) return;
    const task = InteractionManager.runAfterInteractions(() => setOk(true));
    return () => task.cancel();
  }, [ok]);
  return ok;
}

export function FitCamera({
  planet,
  margin = 1.25,
}: {
  planet: Body;
  margin?: number;
}) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const s = planet.scene;
    const extent = !isPlanet(planet)
      ? s.radius * 1.3
      : planet.scene.rings
        ? s.radius * planet.scene.rings.outer
        : s.radius * 1.15;
    const aspect = size.width / Math.max(size.height, 1);
    const halfFov = (cam.fov * Math.PI) / 360;
    const d =
      (extent / Math.tan(halfFov)) * (aspect < 1 ? margin / aspect : margin);
    cam.position.set(0, d * 0.22, d);
    cam.lookAt(0, 0, 0);
  }, [camera, size, planet]);
  return null;
}

/** Ein einzelner Körper groß. Planeten schräg von vorne links beleuchtet. */
export function PlanetViewer({ planet }: { planet: Body }) {
  const sunPos = useMemo(() => new THREE.Vector3(-70, 18, 45), []);
  const speed = useRef(1);
  const days = useRef(0);

  const ready = useAfterTransition();
  return (
    <View
      style={styles.root}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`3D-Ansicht von ${planet.name}`}
    >
      {ready && (
        <Canvas
          style={styles.canvas}
          dpr={[1, 2]}
          gl={{ antialias: Platform.OS === 'web' }}
          camera={{ fov: 30, near: 0.05, far: 2000 }}
        >
          <color attach="background" args={[color.space]} />
          <Stars count={900} />
          {isPlanet(planet) ? (
            <PlanetBody
              key={planet.id}
              planet={planet}
              sunPos={sunPos}
              speed={speed}
              days={days}
            />
          ) : (
            <Sun />
          )}
          <FitCamera planet={planet} />
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  canvas: { flex: 1 },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';
import * as THREE from 'three';

import { Canvas, useFrame, useThree } from '@/lib/r3f';
import { DAYS_PER_SECOND, orbitPosition } from '@/lib/orbit';
import { pickNearest } from '@/lib/pick';
import { color, motion, type } from '@/constants/theme';
import {
  Body,
  Planet,
  isPlanet,
  planets,
  sun,
  sunBody,
} from '@/constants/planets';
import { DaysRef, OrbitLine, PlanetBody, SpeedRef, Stars, Sun } from './bodies';

const MIN_PHI = 0.12;
const MAX_PHI = 1.52;
const MAX_DISTANCE = 240;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Abstand, bei dem der Körper gut ins Bild passt. Hochkant weiter weg, weil das Bild schmaler ist. */
function focusDistance(b: Body, size: { width: number; height: number }) {
  const aspect = size.width / Math.max(size.height, 1);
  const portrait = aspect < 1 ? Math.min(1.9, Math.max(1, 0.8 / aspect)) : 1;
  if (!isPlanet(b)) return b.scene.radius * 6 * portrait;
  return (b.scene.radius * (b.scene.rings ? 6.5 : 7.5) + 1.2) * portrait;
}

function bodyPosition(b: Body, days: number, out: THREE.Vector3) {
  return isPlanet(b) ? orbitPosition(b, days, out) : out.set(0, 0, 0);
}

/**
 * Hält den Zustand der Kamera außerhalb von React, damit Gesten und
 * Buttons sie ändern können, ohne neu zu rendern.
 */
export function createCameraController() {
  const c = {
    goal: { theta: 0.55, phi: 1.02, distance: 80 },
    cur: { theta: 0.55, phi: 1.02, distance: 80, target: new THREE.Vector3() },
    selected: null as Body | null,
    flyFrom: new THREE.Vector3(),
    flyT: 1,
    flyDuration: motion.cameraFly as number,
    initialized: false,
    camera: null as THREE.PerspectiveCamera | null,
    size: { width: 1, height: 1 },
    days: { current: 0 } as DaysRef,
    /** Höhe der UI oben und unten (px), damit der gewählte Planet im freien Bereich steht */
    insets: { top: 0, bottom: 0 },
    shift: 0,
    /** Letzte Eingabe (ms). Nach ein paar Sekunden Ruhe kreist die Kamera langsam. */
    lastInput: 0,
    autoOrbit: true,
    touch() {
      c.lastInput = Date.now();
    },

    minDistance() {
      return c.selected
        ? c.selected.scene.radius * (isPlanet(c.selected) ? 2.4 : 1.8)
        : sun.radius * 3;
    },
    homeDistance() {
      const aspect = c.size.width / Math.max(c.size.height, 1);
      const fit = aspect < 1 ? 30 : 43;
      const halfFov = ((c.camera?.fov ?? 45) * Math.PI) / 360;
      return Math.min(
        MAX_DISTANCE,
        fit / (Math.tan(halfFov) * Math.min(aspect, 1.25))
      );
    },
    clampDistance(d: number) {
      return Math.min(MAX_DISTANCE, Math.max(c.minDistance(), d));
    },
    zoom(factor: number) {
      c.touch();
      c.goal.distance = c.clampDistance(c.goal.distance * factor);
    },
    rotate(dTheta: number, dPhi: number) {
      c.touch();
      c.goal.theta += dTheta;
      c.goal.phi = Math.min(MAX_PHI, Math.max(MIN_PHI, c.goal.phi + dPhi));
    },
    select(p: Body | null) {
      c.touch();
      if (p === c.selected) return;
      c.flyFrom.copy(c.cur.target);
      c.flyT = c.flyDuration > 0 ? 0 : 1;
      c.selected = p;
      c.goal.distance = p ? focusDistance(p, c.size) : c.homeDistance();
    },
    reset() {
      c.touch();
      c.goal.theta = 0.55;
      c.goal.phi = 1.02;
      c.goal.distance = c.selected
        ? focusDistance(c.selected, c.size)
        : c.homeDistance();
    },
    /** Nächster Körper unter dem Finger, großzügig, damit auch kleine Planeten treffbar sind. */
    pick(x: number, y: number): Body | null {
      if (!c.camera) return null;
      return pickNearest(
        c.camera,
        c.size,
        x,
        y,
        ([sunBody, ...planets] as Body[]).map((p) => ({
          item: p,
          position: bodyPosition(p, c.days.current, new THREE.Vector3()),
          radius: p.scene.radius,
          // Die Sonne nur auf der Scheibe, Planeten vor ihr haben Vorrang
          ...(isPlanet(p) ? {} : { reach: (r: number) => r, penalty: 1e4 }),
        }))
      );
    },
  };
  return c;
}

export type CameraController = ReturnType<typeof createCameraController>;

function FirstFrames({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) onReady();
  });
  return null;
}

function SimClock({ days, speed }: { days: DaysRef; speed: SpeedRef }) {
  useFrame((_, dt) => {
    days.current += Math.min(dt, 0.1) * DAYS_PER_SECOND * speed.current;
  });
  return null;
}

function OrbitingPlanet(props: {
  planet: Planet;
  days: DaysRef;
  speed: SpeedRef;
  sunPos: THREE.Vector3;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current)
      orbitPosition(props.planet, props.days.current, ref.current.position);
  });
  return (
    <group ref={ref}>
      <PlanetBody
        planet={props.planet}
        sunPos={props.sunPos}
        speed={props.speed}
        days={props.days}
      />
    </group>
  );
}

function CameraRig({ controller }: { controller: CameraController }) {
  const { camera, size } = useThree();
  const end = useMemo(() => new THREE.Vector3(), []);
  const offset = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    controller.camera = camera as THREE.PerspectiveCamera;
    controller.size = { width: size.width, height: size.height };
    if (!controller.initialized && size.width > 1) {
      const d = controller.selected
        ? focusDistance(controller.selected, controller.size)
        : controller.homeDistance();
      controller.goal.distance = d;
      controller.cur.distance = d;
      controller.initialized = true;
    }
  }, [camera, size, controller]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = controller;
    // Langsames Kreisen, solange niemand eingreift (≈ 2,5 min pro Runde, sanft einsetzend)
    const idle = Date.now() - c.lastInput;
    if (c.autoOrbit && idle > 4000) {
      const ease = Math.min(1, (idle - 4000) / 2500);
      c.goal.theta += dt * 0.042 * ease;
    }
    const k = 1 - Math.exp(-dt * 7);
    c.cur.theta += (c.goal.theta - c.cur.theta) * k;
    c.cur.phi += (c.goal.phi - c.cur.phi) * k;
    c.cur.distance += (c.goal.distance - c.cur.distance) * k;

    if (c.selected) bodyPosition(c.selected, c.days.current, end);
    else end.set(0, 0, 0);

    if (c.flyT < 1) {
      c.flyT = Math.min(1, c.flyT + dt / c.flyDuration);
      c.cur.target.lerpVectors(c.flyFrom, end, easeInOutCubic(c.flyT));
    } else {
      c.cur.target.copy(end);
    }

    // Bildausschnitt verschieben: gewählter Planet mittig zwischen Titelzeile und Infokarte
    const goalShift = c.selected
      ? Math.max(0, (c.insets.bottom - c.insets.top) / 2)
      : 0;
    c.shift += (goalShift - c.shift) * k;
    const cam = camera as THREE.PerspectiveCamera;
    if (Math.abs(c.shift) > 0.5)
      cam.setViewOffset(
        size.width,
        size.height,
        0,
        c.shift,
        size.width,
        size.height
      );
    else if (cam.view?.enabled) cam.clearViewOffset();

    const { theta, phi, distance } = c.cur;
    offset.set(
      distance * Math.sin(phi) * Math.sin(theta),
      distance * Math.cos(phi),
      distance * Math.sin(phi) * Math.cos(theta)
    );
    camera.position.copy(c.cur.target).add(offset);
    camera.lookAt(c.cur.target);
  });

  return null;
}

type Props = {
  controller: CameraController;
  selectedId: string | null;
  speed: number;
  onPick: (body: Body | null) => void;
};

export function SolarSystem({ controller, selectedId, speed, onPick }: Props) {
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const sunPos = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  const [ready, setReady] = useState(false);
  // Im unsichtbaren Tab bleibt die Szene aufgebaut (kein neues Shader-Kompilieren),
  // rendert aber nicht: spart GPU und hält die Liste flüssig
  const focused = useIsFocused();
  const loaderOpacity = useSharedValue(1);
  const loaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
  }));
  useEffect(() => {
    if (ready)
      loaderOpacity.value = withTiming(0, {
        duration: 240,
        easing: motion.easeOut,
      });
  }, [ready, loaderOpacity]);

  const gesture = useMemo(() => {
    let start = { x: 0, y: 0, t: 0 };
    let last = { x: 0, y: 0 };
    let pinch = 0;
    let pinchStartDistance = 0;
    let moved = false;

    const touchDistance = (e: any) => {
      const t = e.nativeEvent.touches;
      if (!t || t.length < 2) return 0;
      return Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e, g) => {
        start = {
          x: e.nativeEvent.locationX,
          y: e.nativeEvent.locationY,
          t: Date.now(),
        };
        last = { x: g.x0, y: g.y0 };
        pinch = 0;
        moved = false;
      },
      onPanResponderMove: (e, g) => {
        const d = touchDistance(e);
        if (d > 0) {
          if (!pinch) {
            pinch = d;
            pinchStartDistance = controller.goal.distance;
          }
          controller.goal.distance = controller.clampDistance(
            pinchStartDistance * (pinch / d)
          );
          moved = true;
          // Sonst springt die Drehung, wenn ein Finger losgelassen wird
          last = { x: g.moveX, y: g.moveY };
          return;
        }
        pinch = 0;
        if (Math.hypot(g.dx, g.dy) > 6) moved = true;
        controller.rotate(
          -(g.moveX - last.x) * 0.006,
          -(g.moveY - last.y) * 0.005
        );
        last = { x: g.moveX, y: g.moveY };
      },
      onPanResponderRelease: () => {
        if (!moved && Date.now() - start.t < 350) {
          onPickRef.current(controller.pick(start.x, start.y));
        }
      },
      onPanResponderTerminationRequest: () => false,
    });
  }, [controller]);

  // Mausrad im Web
  const surfaceRef = useRef<View>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = surfaceRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      controller.zoom(Math.exp(e.deltaY * 0.0012));
    };
    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [controller]);

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <Canvas
          style={styles.canvas}
          dpr={[1, 2]}
          frameloop={focused ? 'always' : 'never'}
          // Nativ ohne MSAA: bei 3× Pixeldichte scharf genug, deutlich weniger GPU-Last
          gl={{ antialias: Platform.OS === 'web' }}
          camera={{ fov: 45, near: 0.05, far: 2000, position: [0, 40, 70] }}
        >
          <color attach="background" args={[color.space]} />
          <SimClock days={controller.days} speed={speedRef} />
          <Stars />
          <Sun />
          {planets.map((p) => (
            <React.Fragment key={p.id}>
              <OrbitLine
                radius={p.scene.orbitRadius}
                active={p.id === selectedId}
              />
              <OrbitingPlanet
                planet={p}
                days={controller.days}
                speed={speedRef}
                sunPos={sunPos}
              />
            </React.Fragment>
          ))}
          <CameraRig controller={controller} />
          <FirstFrames onReady={() => setReady(true)} />
        </Canvas>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.loader, loaderStyle]}
      >
        <Text
          style={[type.bodySmall as any, { color: color.textMuted }]}
          accessibilityLiveRegion="polite"
        >
          Sonnensystem wird geladen
        </Text>
      </Animated.View>
      <View
        ref={surfaceRef}
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="3D-Ansicht des Sonnensystems. Ziehen zum Drehen, zwei Finger zum Zoomen, Planet antippen zum Auswählen."
        {...gesture.panHandlers}
      />
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
});

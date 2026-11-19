/**
 * iOS und Android: eigener, schlanker Canvas auf expo-gl.
 *
 * Der Canvas aus `@react-three/fiber/native` zeigt unter Expo SDK 52 mit der
 * New Architecture auf iOS nichts an (pmndrs/react-three-fiber#3399). Reines
 * expo-gl funktioniert. Deshalb: GLView selbst rendern, den r3f-Renderer per
 * createRoot darauf setzen und jedes Bild mit endFrameEXP ausgeben.
 * Touch-Events von r3f brauchen wir nicht, die Gesten laufen über eigene
 * PanResponder in den Screens.
 *
 * Wichtig: Diese Datei und lib/r3f.tsx müssen dieselbe Endung haben. Metro
 * prüft erst alle .ts- und danach alle .tsx-Dateien, sonst gewinnt die Web-Datei.
 */
import React, { useEffect, useRef, useState } from 'react';
import { PixelRatio, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import * as THREE from 'three';
import { createRoot, extend, invalidate, unmountComponentAtNode, type RootState } from '@react-three/fiber/native';

export { useFrame, useThree } from '@react-three/fiber/native';

// Macht <mesh>, <group>, <color> usw. verfügbar (macht der Original-Canvas intern genauso)
extend(THREE as any);

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  camera?: Record<string, unknown>;
  gl?: Record<string, unknown>;
  /** 'never' pausiert das Rendern, z. B. im unsichtbaren Tab */
  frameloop?: 'always' | 'demand' | 'never';
  /** Nur im Web wirksam, nativ gilt immer die Geräte-Pixeldichte */
  dpr?: number | [number, number];
  onCreated?: (state: RootState) => void;
};

function makeCanvas(context: ExpoWebGLRenderingContext) {
  const canvas: any = {
    style: {},
    width: context.drawingBufferWidth,
    height: context.drawingBufferHeight,
    clientWidth: context.drawingBufferWidth,
    clientHeight: context.drawingBufferHeight,
    getContext: () => context,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    setPointerCapture() {},
    releasePointerCapture() {},
  };
  canvas.ownerDocument = canvas;
  canvas.getRootNode = () => canvas;
  return canvas;
}

export function Canvas({ children, style, camera, gl, frameloop = 'always', onCreated }: Props) {
  // expo-gl rendert immer in der nativen Pixeldichte, `dpr` gilt nur im Web
  const pixelRatio = PixelRatio.get();
  const msaa = gl?.antialias === false ? 0 : 4;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [canvas, setCanvas] = useState<any>(null);
  const [, rerender] = useState(0);
  const root = useRef<ReturnType<typeof createRoot> | null>(null);
  const stateRef = useRef<RootState | null>(null);

  const onContextCreate = (context: ExpoWebGLRenderingContext) => {
    // expo-gl liefert für die Shader-Logs `undefined`, Three.js ruft `.trim()` darauf auf
    const shaderLog = context.getShaderInfoLog.bind(context);
    const programLog = context.getProgramInfoLog.bind(context);
    (context as any).getShaderInfoLog = (s: WebGLShader) => shaderLog(s) ?? '';
    (context as any).getProgramInfoLog = (p: WebGLProgram) => programLog(p) ?? '';
    const c = makeCanvas(context);
    root.current = createRoot(c);
    setCanvas(c);
  };

  if (root.current && canvas && size.width > 0 && size.height > 0) {
    root.current.configure({
      camera: camera as any,
      gl: { ...gl, antialias: false } as any,
      dpr: pixelRatio,
      size: { width: size.width, height: size.height, top: 0, left: 0 },
      // 'always' wird zu 'demand' plus 30-fps-Takt, siehe unten
      frameloop: frameloop === 'never' ? 'never' : 'demand',
      onCreated: (state) => {
        const context = state.gl.getContext() as ExpoWebGLRenderingContext;
        const renderFrame = state.gl.render.bind(state.gl);
        state.gl.render = (scene, cam) => {
          renderFrame(scene, cam);
          context.endFrameEXP();
        };
        stateRef.current = state;
        onCreated?.(state);
      },
    });
    root.current.render(<>{children}</>);
  }

  useEffect(() => {
    if (!canvas) return;
    // Nach Fast Refresh oder StrictMode läuft der Effekt erneut: dann neuen Root anlegen
    if (!root.current) {
      root.current = createRoot(canvas);
      rerender((n) => n + 1);
    }
    return () => {
      unmountComponentAtNode(canvas);
      root.current = null;
      stateRef.current = null;
    };
  }, [canvas]);

  // 30-fps-Takt: Mit jeder Bildwiederholung stellt expo-gl mehr Bilder in die
  // Warteschlange, als die GPU schafft, und das Bild friert ein.
  useEffect(() => {
    if (frameloop !== 'always') return;
    const id = setInterval(() => {
      // Immer den aktuellen Zustand holen: der aus onCreated ist ein veralteter Schnappschuss
      const state = stateRef.current?.get();
      if (state) invalidate(state);
    }, 1000 / 30);
    return () => clearInterval(id);
  }, [frameloop]);

  return (
    <View
      style={[{ flex: 1 }, style]}
      onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {size.width > 0 && <GLView style={StyleSheet.absoluteFill} msaaSamples={msaa} onContextCreate={onContextCreate} />}
    </View>
  );
}

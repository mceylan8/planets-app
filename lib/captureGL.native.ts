// iOS und Android: expo-gl liest den Framebuffer und schreibt eine PNG-Datei in den Cache.
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import type * as THREE from 'three';

export async function captureGL(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): Promise<string | null> {
  // Der Render-Wrapper in lib/r3f.native.tsx ruft danach endFrameEXP auf
  gl.render(scene, camera);
  try {
    const snap = await GLView.takeSnapshotAsync(gl.getContext() as ExpoWebGLRenderingContext, {
      format: 'png',
      flip: false,
    });
    return typeof snap.uri === 'string' ? snap.uri : null;
  } catch {
    return null;
  }
}

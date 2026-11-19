// Web: Bild frisch rendern und sofort auslesen. Im selben Durchlauf ist der
// Zeichenpuffer noch gefüllt, dafür braucht es kein preserveDrawingBuffer.
// iOS und Android nehmen lib/captureGL.native.ts.
import type * as THREE from 'three';

export async function captureGL(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): Promise<string | null> {
  gl.render(scene, camera);
  try {
    return (gl.domElement as HTMLCanvasElement).toDataURL('image/png');
  } catch {
    return null;
  }
}

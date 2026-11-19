/**
 * Shader für den Schaukasten: gebastelter Karton, Pappmaché-Planeten im
 * Cartoon-Stil (Farbstufen statt weicher Verläufe), gemalte Sterne.
 * Alle billig pro Pixel: höchstens ein Rauschwert, keine Schleifen.
 */

const noise = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float hash2(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}
`;

const litVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
varying vec2 vUv;
void main() {
  vObj = position;
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

/** Dreistufiges Cartoon-Licht mit weichen Kanten zwischen den Stufen */
const toon = /* glsl */ `
float toon(float d) {
  float a = smoothstep(0.02, 0.08, d);
  float b = smoothstep(0.45, 0.52, d);
  return 0.42 + 0.3 * a + 0.28 * b;
}
`;

/** Innenwände: dunkelblaues Papier mit gemalten gelben Sternen */
export const paperShader = {
  vertex: litVertex,
  fragment: /* glsl */ `
uniform vec3 uColor;
uniform vec3 uStar;
uniform vec2 uCells;
uniform float uSeed;
uniform vec3 uLamp;
uniform float uBright;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
varying vec2 vUv;
${noise}
void main() {
  // Papierfasern
  float fiber = noise(vWorld * 9.0) * 0.08 + noise(vWorld * 31.0) * 0.04;
  vec3 col = uColor * (0.94 + fiber);

  // Gemalte Sterne: pro Zelle höchstens einer, leicht schief und unterschiedlich groß
  vec2 g = vUv * uCells;
  vec2 cell = floor(g);
  float h = hash2(cell + uSeed);
  if (h > 0.62) {
    vec2 c = fract(g) - 0.5 + (vec2(hash2(cell + 3.1), hash2(cell + 7.7)) - 0.5) * 0.5;
    float r = length(c);
    float a = atan(c.y, c.x) + h * 6.28;
    float k = 0.5 + 0.5 * cos(5.0 * a);
    float size = 0.1 + 0.12 * hash2(cell + 1.3);
    float edge = mix(0.42, 1.0, k) * size;
    float star = 1.0 - smoothstep(edge * 0.88, edge, r);
    col = mix(col, uStar, star * 0.95);
  }

  // Licht der Lampe und dunklere Ecken (wie in einer echten Box)
  float lamp = 0.62 + 0.38 * max(dot(normalize(vN), normalize(uLamp - vWorld)), 0.0);
  lamp = mix(0.28, lamp, uBright);
  vec2 e = min(vUv, 1.0 - vUv);
  float corner = smoothstep(0.0, 0.18, min(e.x, e.y));
  col *= lamp * mix(0.62, 1.0, corner);
  gl_FragColor = vec4(col, 1.0);
}
`,
};

/** Karton für den Rand der Box */
export const cardboardShader = {
  vertex: litVertex,
  fragment: /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLamp;
uniform float uBright;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
varying vec2 vUv;
${noise}
void main() {
  float grain = noise(vWorld * 14.0) * 0.1;
  float ribs = 0.04 * sin(vWorld.x * 60.0 + vWorld.y * 60.0);
  float lamp = 0.7 + 0.3 * max(dot(normalize(vN), normalize(uLamp - vWorld)), 0.0);
  lamp = mix(0.32, lamp, uBright);
  gl_FragColor = vec4(uColor * (0.92 + grain + ribs) * lamp, 1.0);
}
`,
};

/** Pappmaché-Planeten: vorberechnete Oberfläche, Farbstufen, leicht unebene Normalen */
export const papierShader = {
  vertex: litVertex,
  fragment: /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uLamp;
uniform float uEmissive;
uniform float uBright;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
varying vec2 vUv;
${noise}
${toon}
const float PI = 3.14159265;
vec2 dirToUv(vec3 p) {
  return vec2(atan(p.z, p.x) / (2.0 * PI) + 0.5, asin(clamp(p.y, -1.0, 1.0)) / PI + 0.5);
}
void main() {
  vec3 p = normalize(vObj);
  vec3 col = texture2D(uMap, dirToUv(p)).rgb;
  // Farben leicht abstufen, wie gemalt
  col = floor(col * 7.0 + 0.5) / 7.0;
  // Pappmaché: Normale minimal verwackeln
  vec3 bump = vec3(noise(vObj * 7.0), noise(vObj * 7.0 + 4.3), noise(vObj * 7.0 + 9.1)) - 0.5;
  vec3 N = normalize(normalize(vN) + bump * 0.35);
  vec3 L = normalize(uLamp - vWorld);
  float lit = toon(dot(N, L));
  // Lampe aus: nur Restlicht; Lampe an: Toon + Eigenleuchten
  lit = mix(0.22, lit, uBright);
  float light = mix(lit, 1.0, uEmissive * uBright);
  vec3 V = normalize(cameraPosition - vWorld);
  float rim = smoothstep(0.62, 0.8, 1.0 - max(dot(normalize(vN), V), 0.0)) * 0.12 * uBright;
  // Leichtes Eigenleuchten, wenn die Sonne unten brennt
  vec3 glow = col * uEmissive * uBright * 0.35;
  gl_FragColor = vec4(col * light + rim + glow, 1.0);
}
`,
};

/** Flache Cartoon-Farbe für Sonnenstrahlen und Ähnliches */
export const flatToonShader = {
  vertex: litVertex,
  fragment: /* glsl */ `
uniform vec3 uColor;
uniform vec3 uLamp;
uniform float uBright;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
varying vec2 vUv;
${noise}
${toon}
void main() {
  float grain = noise(vWorld * 12.0) * 0.06;
  float light = toon(dot(normalize(vN), normalize(uLamp - vWorld)));
  light = mix(0.25, light * 0.6 + 0.4, uBright);
  gl_FragColor = vec4(uColor * light * (0.97 + grain), 1.0);
}
`,
};

/** Saturnring aus Pappe, warmer Sandton mit leichtem Glanz */
export const ringToonShader = {
  vertex: litVertex,
  fragment: /* glsl */ `
uniform vec3 uColor;
uniform float uInner;
uniform float uOuter;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
varying vec2 vUv;
void main() {
  float r = length(vObj.xy);
  float t = (r - uInner) / (uOuter - uInner);
  float bands = step(0.5, fract(t * 4.0)) * 0.12;
  vec3 V = normalize(cameraPosition - vWorld);
  float f = abs(dot(normalize(vN), V));
  // Warmer Sand-Schimmer statt Regenbogen (der wirkte hellgrün)
  vec3 warm = vec3(0.9, 0.82, 0.62);
  vec3 sheen = mix(uColor, warm, 0.35) * (0.88 + 0.2 * f);
  vec3 col = mix(uColor * (0.95 + bands), sheen, 0.2);
  float edge = smoothstep(0.0, 0.04, t) * (1.0 - smoothstep(0.96, 1.0, t));
  gl_FragColor = vec4(col, edge * 0.95);
}
`,
};

/** Weicher Schatten auf dem Boden */
export const blobShader = {
  vertex: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragment: /* glsl */ `
uniform float uStrength;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.2, 1.0, d)) * uStrength;
  gl_FragColor = vec4(0.0, 0.0, 0.05, a);
}
`,
};

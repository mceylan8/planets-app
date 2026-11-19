/**
 * GLSL für alle Himmelskörper.
 *
 * Zwei Stufen:
 * 1. `bakeShader` rechnet die Oberfläche (3D-Rauschen, Farbverläufe) EINMAL
 *    in eine Textur (equirektangulär, wie eine Weltkarte).
 * 2. `planetShader` / `sunShader` lesen pro Bild nur diese Textur und rechnen
 *    Licht, Schatten und Atmosphärenrand. Das ist billig, deshalb läuft es auch
 *    auf Handys und im iOS-Simulator flüssig.
 *
 * Oberflächenart, Sturmfleck und Polkappen werden per #define gewählt.
 * Farben sind sRGB-Werte und werden ohne Umrechnung ausgegeben.
 */

const noise = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
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
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return v;
}
`;

/** Richtung auf der Kugel <-> Texturkoordinate (wie eine Weltkarte) */
const sphereUv = /* glsl */ `
const float PI = 3.14159265;
vec2 dirToUv(vec3 p) {
  return vec2(atan(p.z, p.x) / (2.0 * PI) + 0.5, asin(clamp(p.y, -1.0, 1.0)) / PI + 0.5);
}
vec3 uvToDir(vec2 uv) {
  float lon = (uv.x - 0.5) * 2.0 * PI;
  float lat = (uv.y - 0.5) * PI;
  return vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
}
`;

/* ---------- Stufe 1: Oberfläche einmal in eine Textur rechnen ---------- */

export const bakeShader = {
  vertex: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`,
  fragment: /* glsl */ `
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform float uBandFreq;
uniform float uBandContrast;
uniform float uTurb;
uniform float uSeed;
uniform float uCaps;
uniform vec4 uSpot;
uniform vec3 uSpotColor;
varying vec2 vUv;
${noise}
${sphereUv}
void main() {
  vec3 p = uvToDir(vUv);
  vec3 col;

#if KIND == 0
  // Gestein: Flecken, Hochland, Krater
  float n = fbm(p * 3.0 + uSeed);
  float m = fbm(p * 9.0 + uSeed * 2.0);
  col = mix(uB, uA, smoothstep(0.3, 0.7, n));
  col = mix(col, uC, smoothstep(0.55, 0.8, m) * 0.6);
  float crater = smoothstep(0.6, 0.66, noise(p * 16.0 + uSeed));
  col *= 1.0 - crater * 0.22;
#elif KIND == 1
  // Wolkenbänder, verwirbelt
  float warp = fbm(p * vec3(2.0, 7.0, 2.0) + uSeed);
  float lat = p.y + (warp - 0.5) * uTurb * 0.25;
  float b1 = sin(lat * uBandFreq) * 0.5 + 0.5;
  float b2 = sin(lat * uBandFreq * 2.3 + 1.7) * 0.5 + 0.5;
  col = mix(uA, uB, b1 * uBandContrast);
  col = mix(col, uC, b2 * uBandContrast * 0.6);
  #ifdef HAS_SPOT
  {
    float lon = atan(p.z, p.x);
    float la = asin(clamp(p.y, -1.0, 1.0));
    vec2 d = vec2((lon - uSpot.y) * 0.55, (la - uSpot.x) * 1.3);
    float s = 1.0 - smoothstep(uSpot.z * 0.55, uSpot.z, length(d));
    col = mix(col, uSpotColor, s * uSpot.w);
  }
  #endif
#elif KIND == 2
  // Erde: Ozean, Land, Wolken
  float n = fbm(p * 2.2 + uSeed);
  float land = smoothstep(0.5, 0.53, n);
  vec3 ocean = mix(uA * 0.62, uA, smoothstep(0.3, 0.5, n));
  float dry = fbm(p * 5.0 + 3.0);
  vec3 ground = mix(uB, uC, smoothstep(0.45, 0.7, dry) * (1.0 - abs(p.y)));
  col = mix(ocean, ground, land);
  float cl = fbm(p * 4.0 + 11.0);
  col = mix(col, vec3(0.95), smoothstep(0.55, 0.75, cl) * 0.7);
#else
  // Sonne: Granulation
  float n = fbm(p * 4.0);
  float g = fbm(p * 14.0 + 5.0);
  col = mix(vec3(1.0, 0.7, 0.3), vec3(1.0, 0.97, 0.86), smoothstep(0.35, 0.75, n * 0.6 + g * 0.4));
#endif

#ifdef HAS_CAPS
  {
    float edge = 1.0 - uCaps + (fbm(p * 6.0 + uSeed) - 0.5) * 0.08;
    float cap = smoothstep(edge, edge + 0.02, abs(p.y));
    col = mix(col, vec3(0.93, 0.95, 0.97), cap);
  }
#endif

  gl_FragColor = vec4(col, 1.0);
}
`,
};

/* ---------- Stufe 2: pro Bild nur Textur + Licht ---------- */

const bodyVertex = /* glsl */ `
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
void main() {
  vObj = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const planetShader = {
  vertex: bodyVertex,
  fragment: /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uRim;
uniform vec3 uSunPos;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
${sphereUv}
void main() {
  vec3 col = texture2D(uMap, dirToUv(normalize(vObj))).rgb;
  vec3 N = normalize(vN);
  vec3 L = normalize(uSunPos - vWorld);
  vec3 V = normalize(cameraPosition - vWorld);
  float ndl = dot(N, L);
  float diff = smoothstep(-0.12, 0.6, ndl);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 c = col * (0.03 + 0.97 * diff);
  c += uRim * fres * smoothstep(-0.3, 0.45, ndl) * 0.85;
  gl_FragColor = vec4(c, 1.0);
}
`,
};

export const sunShader = {
  vertex: bodyVertex,
  fragment: /* glsl */ `
uniform sampler2D uMap;
varying vec3 vN;
varying vec3 vWorld;
varying vec3 vObj;
${sphereUv}
void main() {
  vec3 col = texture2D(uMap, dirToUv(normalize(vObj))).rgb;
  vec3 V = normalize(cameraPosition - vWorld);
  float mu = max(dot(normalize(vN), V), 0.0);
  col *= 0.62 + 0.38 * pow(mu, 0.45);
  col = mix(col, vec3(1.0, 0.52, 0.18), (1.0 - mu) * 0.3);
  gl_FragColor = vec4(col, 1.0);
}
`,
};

export const glowShader = {
  vertex: /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragment: /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
void main() {
  float d = clamp(1.0 - length(vUv - 0.5) * 2.0, 0.0, 1.0);
  float a = pow(d, 2.4) * uIntensity + pow(d, 9.0) * 0.5;
  gl_FragColor = vec4(uColor, clamp(a, 0.0, 1.0));
}
`,
};

export const ringShader = {
  vertex: /* glsl */ `
varying vec3 vLocal;
varying vec3 vWorld;
void main() {
  vLocal = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`,
  fragment: /* glsl */ `
uniform float uInner;
uniform float uOuter;
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uSunPos;
uniform vec3 uPlanetPos;
uniform float uPlanetR;
varying vec3 vLocal;
varying vec3 vWorld;
${noise}
void main() {
  float r = length(vLocal.xy);
  float t = (r - uInner) / (uOuter - uInner);
  float fine = noise(vec3(t * 140.0, 0.5, 0.5));
  float bands = 0.55 + 0.45 * sin(t * 58.0 + sin(t * 13.0) * 2.0);
  float dens = bands * (0.55 + 0.45 * fine);
  dens *= smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.92, 1.0, t));
  dens *= 1.0 - (1.0 - smoothstep(0.0, 0.018, abs(t - 0.66))) * 0.92;
  dens *= mix(0.3, 1.0, smoothstep(0.14, 0.26, t));
  vec3 col = mix(uB, uA, clamp(fine * 0.5 + t * 0.6, 0.0, 1.0));

  // Schatten des Planeten auf den Ringen
  vec3 toSun = normalize(uSunPos - vWorld);
  vec3 oc = vWorld - uPlanetPos;
  float b = dot(oc, toSun);
  float h = b * b - (dot(oc, oc) - uPlanetR * uPlanetR);
  float shadow = (h > 0.0 && b < 0.0) ? 0.18 : 1.0;

  gl_FragColor = vec4(col * shadow, dens * 0.85);
}
`,
};

import type * as THREE from 'three';

import type { Planet } from '@/constants/planets';

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** 1× Geschwindigkeit: die Erde braucht 40 Sekunden für eine Runde. */
export const DAYS_PER_SECOND = 365.26 / 40;

/** Winkel auf der Bahn. Umlaufzeiten im echten Verhältnis zueinander. */
export function orbitAngle(p: Planet, days: number) {
  return p.scene.startAngleDeg * DEG + (days / p.facts.orbitDays) * TAU;
}

/** Position in der Bahnebene (y = 0), gegen den Uhrzeigersinn von oben gesehen. */
export function orbitPosition(p: Planet, days: number, out: THREE.Vector3) {
  const a = orbitAngle(p, days);
  return out.set(
    Math.cos(a) * p.scene.orbitRadius,
    0,
    -Math.sin(a) * p.scene.orbitRadius
  );
}

/**
 * Eigenrotation in rad/s, sichtbar gemacht: echte Tageslängen wären zu schnell
 * oder zu langsam zum Hinsehen. Die Reihenfolge bleibt erhalten. Die Drehrichtung
 * steckt in der Achsneigung (Venus 177°, Uranus 98°), deshalb hier der Betrag.
 */
export function spinRate(p: Planet) {
  return 0.35 * Math.pow(24 / Math.abs(p.scene.rotationHours), 0.35);
}

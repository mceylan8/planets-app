import * as THREE from 'three';

import { getPlanet, planets } from '@/constants/planets';
import { orbitAngle, orbitPosition, spinRate } from '../orbit';

const earth = getPlanet('erde')!;

describe('Bahnen', () => {
  it('startet beim Startwinkel', () => {
    expect(orbitAngle(earth, 0)).toBeCloseTo((earth.scene.startAngleDeg * Math.PI) / 180);
  });

  it('liegt in der Ebene und hält den Bahnradius', () => {
    const v = new THREE.Vector3();
    for (const p of planets) {
      orbitPosition(p, 123.4, v);
      expect(v.y).toBe(0);
      expect(v.length()).toBeCloseTo(p.scene.orbitRadius);
    }
  });

  it('ist nach einer Umlaufzeit wieder am selben Ort', () => {
    const a = orbitPosition(earth, 10, new THREE.Vector3());
    const b = orbitPosition(earth, 10 + earth.facts.orbitDays, new THREE.Vector3());
    expect(a.distanceTo(b)).toBeLessThan(1e-9);
  });

  it('läuft innen schneller als außen (echtes Verhältnis der Umlaufzeiten)', () => {
    const speed = (id: string) => orbitAngle(getPlanet(id)!, 1) - orbitAngle(getPlanet(id)!, 0);
    expect(speed('merkur')).toBeGreaterThan(speed('erde'));
    expect(speed('erde')).toBeGreaterThan(speed('neptun'));
    expect(speed('merkur') / speed('erde')).toBeCloseTo(365.26 / 87.97);
  });
});

describe('spinRate', () => {
  it('erhält die Reihenfolge der Tageslängen, auch bei rückläufigen Planeten', () => {
    const rate = (id: string) => spinRate(getPlanet(id)!);
    expect(rate('jupiter')).toBeGreaterThan(rate('erde'));
    expect(rate('erde')).toBeGreaterThan(rate('venus'));
    expect(rate('venus')).toBeGreaterThan(0);
  });
});

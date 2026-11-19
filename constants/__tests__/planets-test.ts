import {
  bodies,
  detailFacts,
  formatDistance,
  formatKm,
  formatTemp,
  getBody,
  isPlanet,
  planets,
  quickFacts,
} from '../planets';

describe('Formatierung', () => {
  it('formatiert Kilometer mit Tausenderpunkt', () => {
    expect(formatKm(12742)).toBe('12.742 km');
    expect(formatKm(1391400)).toBe('1.391.400 km');
  });

  it('schreibt Entfernungen ab 1000 Mio. km als Mrd.', () => {
    expect(formatDistance(149.6)).toBe('149,6 Mio. km');
    expect(formatDistance(1432)).toBe('1,43 Mrd. km');
  });

  it('nutzt ein echtes Minuszeichen bei Temperaturen', () => {
    expect(formatTemp(-140)).toBe('−140 °C');
    expect(formatTemp(15)).toBe('15 °C');
  });
});

describe('Daten', () => {
  it('hat acht Planeten in der Reihenfolge von der Sonne aus', () => {
    expect(planets.map((p) => p.id)).toEqual([
      'merkur', 'venus', 'erde', 'mars', 'jupiter', 'saturn', 'uranus', 'neptun',
    ]);
    for (let i = 1; i < planets.length; i++) {
      expect(planets[i].facts.distanceMioKm).toBeGreaterThan(planets[i - 1].facts.distanceMioKm);
      expect(planets[i].facts.orbitDays).toBeGreaterThan(planets[i - 1].facts.orbitDays);
      expect(planets[i].scene.orbitRadius).toBeGreaterThan(planets[i - 1].scene.orbitRadius);
    }
  });

  it('hat eindeutige IDs und findet die Sonne', () => {
    const ids = bodies.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getBody('sonne')?.type).toBe('star');
    expect(isPlanet(getBody('sonne'))).toBe(false);
    expect(getBody('pluto')).toBeUndefined();
  });

  it('liefert drei Kennzahlen für die Infokarte und sechs für die Detailseite', () => {
    for (const b of bodies) {
      expect(quickFacts(b)).toHaveLength(3);
      expect(detailFacts(b)).toHaveLength(6);
    }
    expect(quickFacts(getBody('erde')!)).toEqual([
      { label: 'Durchmesser', value: '12.742 km' },
      { label: 'Umlaufzeit', value: '365,25 Tage' },
      { label: 'Monde', value: '1' },
    ]);
  });
});

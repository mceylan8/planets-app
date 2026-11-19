import { defaultDesign, isDefaultDesign, sanitize } from '../boxDesign';

const ids = ['merkur', 'venus', 'erde', 'mars'];

describe('sanitize', () => {
  it('übernimmt ein gültiges Design', () => {
    const d = sanitize({ order: ['erde', 'merkur', 'venus', 'mars'], paint: { erde: '#D9534F' } }, ids);
    expect(d).toEqual({
      order: ['erde', 'merkur', 'venus', 'mars'],
      paint: { erde: '#D9534F' },
      style: 'threads',
      material: 'paper',
    });
  });

  it('wirft Unbekanntes und Doppeltes raus und hängt Fehlendes hinten an', () => {
    const d = sanitize({ order: ['mars', 'pluto', 'mars', 'erde'] }, ids);
    expect(d.order).toEqual(['mars', 'erde', 'merkur', 'venus']);
  });

  it('nimmt nur Farben aus dem Tuschkasten', () => {
    const d = sanitize({ order: ids, paint: { erde: '#123456', venus: '#4A78D0', pluto: '#D9534F' } }, ids);
    expect(d.paint).toEqual({ venus: '#4A78D0' });
  });

  it('fällt bei Unsinn auf die Werks-Reihenfolge zurück', () => {
    expect(sanitize(null, ids)).toEqual(defaultDesign(ids));
    expect(sanitize('kaputt', ids)).toEqual(defaultDesign(ids));
    expect(sanitize({ order: 'x', paint: 3 }, ids)).toEqual(defaultDesign(ids));
  });
});

describe('Aufbau und Material', () => {
  it('übernimmt Bögen und Strick, sonst das Design ab Werk', () => {
    expect(sanitize({ order: ids, style: 'arcs', material: 'knit' }, ids)).toMatchObject({ style: 'arcs', material: 'knit' });
    expect(sanitize({ order: ids, style: 'wirr', material: 7 }, ids)).toMatchObject({ style: 'threads', material: 'paper' });
  });
});

describe('isDefaultDesign', () => {
  it('erkennt den Kasten ab Werk', () => {
    expect(isDefaultDesign(defaultDesign(ids), ids)).toBe(true);
    const base = defaultDesign(ids);
    expect(isDefaultDesign({ ...base, order: ['venus', 'merkur', 'erde', 'mars'] }, ids)).toBe(false);
    expect(isDefaultDesign({ ...base, paint: { erde: '#D9534F' } }, ids)).toBe(false);
    expect(isDefaultDesign({ ...base, style: 'arcs' }, ids)).toBe(false);
  });
});

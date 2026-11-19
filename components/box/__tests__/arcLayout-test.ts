import { ArcBodySpec, arcLayout, extentOf } from '../arcLayout';

const specs: Record<string, ArcBodySpec> = {
  merkur: { id: 'merkur', r: 0.3, moon: 0 },
  venus: { id: 'venus', r: 0.46, moon: 0 },
  erde: { id: 'erde', r: 0.48, moon: 0.27 },
  mars: { id: 'mars', r: 0.38, moon: 0.16 },
  ceres: { id: 'ceres', r: 0.2, moon: 0 },
  jupiter: { id: 'jupiter', r: 0.9, moon: 0.14 },
  saturn: { id: 'saturn', r: 0.64, moon: 0.17, ring: true },
  uranus: { id: 'uranus', r: 0.56, moon: 0.13 },
  neptun: { id: 'neptun', r: 0.54, moon: 0.17 },
  pluto: { id: 'pluto', r: 0.24, moon: 0.42 },
};
const real = Object.keys(specs);
const orders = {
  real,
  reversed: [...real].reverse(),
  bigFirst: ['jupiter', 'saturn', 'uranus', 'neptun', 'erde', 'venus', 'mars', 'merkur', 'pluto', 'ceres'],
};
const boxes = {
  quer: { W: 11.6, H: 6.6, sunR: 1.7, side: false },
  hochkant: { W: 6.4, H: 10, sunR: 1.7, side: true },
};

describe('arcLayout', () => {
  for (const [boxName, box] of Object.entries(boxes)) {
    for (const [orderName, order] of Object.entries(orders)) {
      it(`keine Kugel steckt in einer anderen (${boxName}, ${orderName})`, () => {
        const list = order.map((id) => specs[id]);
        const res = arcLayout(list, box);
        // Nicht winzig werden lassen
        expect(res.k).toBeGreaterThan(0.55);
        const placed = list.map((b) => ({ b, s: res.slots[b.id], e: extentOf(b, res.k) }));
        for (let i = 0; i < placed.length; i++) {
          const p = placed[i];
          // In der Box
          expect(Math.abs(p.s.x) + p.e.ex).toBeLessThanOrEqual(box.W / 2);
          expect(p.s.y + p.e.top).toBeLessThanOrEqual(box.H / 2);
          for (let j = i + 1; j < placed.length; j++) {
            const q = placed[j];
            const apartX = Math.abs(p.s.x - q.s.x) >= p.e.ex + q.e.ex;
            const apartY = Math.abs(p.s.y - q.s.y) >= Math.min(p.e.ey + q.e.ey, Infinity);
            expect(apartX || apartY).toBe(true);
          }
        }
      });
    }
  }

  it('gleiche Reihenfolge ergibt gleiche Anordnung', () => {
    const list = real.map((id) => specs[id]);
    expect(arcLayout(list, boxes.quer)).toEqual(arcLayout(list, boxes.quer));
  });
});

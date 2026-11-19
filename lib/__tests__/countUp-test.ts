import { easeOutCubic, parseNumbers, textAt } from '../countUp';

describe('parseNumbers', () => {
  it('erkennt deutsche Zahlen mit Tausenderpunkt und Komma', () => {
    expect(parseNumbers('1.391.400 km')).toEqual([{ value: 1391400, decimals: 0, grouped: true }]);
    expect(parseNumbers('4,6 Mrd. J.')).toEqual([{ value: 4.6, decimals: 1, grouped: false }]);
    expect(parseNumbers('23 h 56 min').map((p) => p.value)).toEqual([23, 56]);
    expect(parseNumbers('keine Zahl')).toEqual([]);
  });
});

describe('textAt', () => {
  it('zeigt am Ende genau den Originaltext', () => {
    for (const text of ['12.742 km', '149,6 Mio. km', '23 h 56 min', '−140 °C', '99,86 %']) {
      expect(textAt(text, 1)).toBe(text);
    }
  });

  it('zählt alle Zahlen anteilig hoch und behält das Format', () => {
    expect(textAt('12.742 km', 0.5)).toBe('6.371 km');
    expect(textAt('4,6 Mrd. J.', 0.5)).toBe('2,3 Mrd. J.');
    expect(textAt('23 h 56 min', 0.5)).toBe('12 h 28 min');
  });

  it('beginnt bei 0 und zeigt kein „−0“', () => {
    expect(textAt('12.742 km', 0)).toBe('0 km');
    expect(textAt('−140 °C', 0)).toBe('0 °C');
  });

  it('lässt Text ohne Zahlen unverändert', () => {
    expect(textAt('Stern', 0.3)).toBe('Stern');
  });
});

describe('easeOutCubic', () => {
  it('geht von 0 nach 1 und ist am Anfang schneller', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

import { getBody } from '@/constants/planets';
import { big, lightTime, sizeComparison, travelFacts, travelYears, weightFact } from '../compare';

const body = (id: string) => getBody(id)!;

describe('lightTime', () => {
  it('rechnet die Lichtlaufzeit', () => {
    expect(lightTime(149.6e6)).toBe('8 min 19 s');
    expect(lightTime(778.5e6)).toBe('43 min 17 s');
    expect(lightTime(4515e6)).toBe('4 h 11 min');
  });

  it('zeigt nie „60 min“', () => {
    expect(lightTime(299792.458 * 7199)).toBe('2 h 0 min');
  });
});

describe('travelYears', () => {
  it('rundet ab 10 Jahren auf ganze Jahre', () => {
    expect(travelYears(149.6e6, 100)).toBe('171 Jahre');
    expect(travelYears(149.6e6, 900)).toBe('19 Jahre');
    expect(travelYears(57.9e6, 900)).toBe('7,3 Jahre');
  });
});

describe('big', () => {
  it('schreibt Millionen in Worten', () => {
    expect(big(1321.3)).toBe('1.321');
    expect(big(1302000)).toBe('1,3 Millionen');
  });
});

describe('sizeComparison', () => {
  it('vergleicht große Körper mit der Erde', () => {
    expect(sizeComparison(body('jupiter'))).toMatchObject({
      title: '11× so breit wie die Erde',
      sub: 'Rund 1.321 Erden würden hineinpassen.',
      refName: 'Erde',
    });
    expect(sizeComparison(body('sonne')).sub).toBe('Rund 1,3 Millionen Erden würden hineinpassen.');
  });

  it('dreht den Vergleich bei kleineren Planeten um', () => {
    expect(sizeComparison(body('merkur'))).toMatchObject({
      title: 'Die Erde ist 2,6× so breit',
      sub: 'Merkur würde rund 18-mal in die Erde passen.',
    });
  });

  it('vergleicht die Erde mit dem Mond', () => {
    expect(sizeComparison(body('erde'))).toMatchObject({
      title: '3,7× so breit wie der Mond',
      sub: 'Rund 49 Monde würden hineinpassen.',
      refName: 'Mond',
    });
  });
});

describe('travelFacts und weightFact', () => {
  it('rechnet Planeten von der Sonne, die Sonne von der Erde aus', () => {
    expect(travelFacts(body('jupiter'))[0]).toEqual({ label: 'Licht von der Sonne', value: '43 min 17 s' });
    expect(travelFacts(body('sonne'))[0]).toEqual({ label: 'Licht von der Erde', value: '8 min 19 s' });
  });

  it('rechnet das Gewicht über die Schwerkraft um', () => {
    expect(weightFact(body('jupiter')).value).toBe('165 kg');
    expect(weightFact(body('sonne')).value).toBe('1.957 kg');
    expect(weightFact(body('erde'))).toEqual({ label: '70 kg auf der Erde wiegen auf dem Mond', value: '11 kg' });
  });
});

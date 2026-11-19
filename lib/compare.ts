import { Body, FactItem, isPlanet } from '@/constants/planets';

const EARTH_D = 12742;
const MOON_D = 3474.8;
const LIGHT_KM_S = 299792.458;
const EARTH_G = 9.8;
const MOON_G = 1.6;
/** Mittlere Entfernung Erde–Sonne in Mio. km */
const AU_MIO_KM = 149.6;
export const BODY_KG = 70;

const de = (n: number, digits = 1) =>
  new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

/** Große Zahlen lesbar: ab einer Million in Worten */
export function big(n: number) {
  if (n >= 1e6) return `${de(n / 1e6)} Millionen`;
  return de(Math.round(n), 0);
}

export function lightTime(km: number) {
  const s = Math.round(km / LIGHT_KM_S);
  if (s < 3600) return `${Math.floor(s / 60)} min ${s % 60} s`;
  const min = Math.round(s / 60);
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

export function travelYears(km: number, kmh: number) {
  const y = km / kmh / 24 / 365.25;
  return `${de(y, y < 10 ? 1 : 0)} Jahre`;
}

export type SizeComparison = {
  title: string;
  sub: string;
  /** Durchmesser im Verhältnis zur Referenz (Erde, bei der Erde der Mond) */
  ratio: number;
  refName: 'Erde' | 'Mond';
};

export function sizeComparison(body: Body): SizeComparison {
  const isEarth = body.id === 'erde';
  const ratio = body.facts.diameterKm / (isEarth ? MOON_D : EARTH_D);
  if (ratio >= 1) {
    return {
      title: `${de(ratio)}× so breit wie ${isEarth ? 'der Mond' : 'die Erde'}`,
      sub: `Rund ${big(ratio ** 3)} ${isEarth ? 'Monde' : 'Erden'} würden hineinpassen.`,
      ratio,
      refName: isEarth ? 'Mond' : 'Erde',
    };
  }
  return {
    title: `Die Erde ist ${de(1 / ratio)}× so breit`,
    sub: `${body.name} würde rund ${big(1 / ratio ** 3)}-mal in die Erde passen.`,
    ratio,
    refName: 'Erde',
  };
}

/** Reisezeiten von der Sonne zum Planeten, bei der Sonne von der Erde aus */
export function travelFacts(body: Body): FactItem[] {
  const fromSun = isPlanet(body);
  const km = (fromSun ? body.facts.distanceMioKm : AU_MIO_KM) * 1e6;
  const from = fromSun ? 'von der Sonne' : 'von der Erde';
  return [
    { label: `Licht ${from}`, value: lightTime(km) },
    { label: `Auto mit 100 km/h ${from}`, value: travelYears(km, 100) },
    { label: `Flugzeug mit 900 km/h ${from}`, value: travelYears(km, 900) },
  ];
}

/** Was 70 kg auf der Erde dort wiegen. Bei der Erde: auf dem Mond. */
export function weightFact(body: Body): FactItem {
  if (body.id === 'erde') {
    return {
      label: `${BODY_KG} kg auf der Erde wiegen auf dem Mond`,
      value: `${de(BODY_KG * (MOON_G / EARTH_G), 0)} kg`,
    };
  }
  return {
    label: `${BODY_KG} kg auf der Erde wiegen hier wie`,
    value: `${big(BODY_KG * (body.facts.gravity / EARTH_G))} kg`,
  };
}

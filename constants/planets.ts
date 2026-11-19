/**
 * Alle Planetendaten an einer Stelle.
 *
 * Fakten: NASA Planetary Fact Sheet und NASA Solar System Exploration.
 * Mondzahlen: bestätigte Monde, Stand 2025.
 *
 * Werte unter `scene` sind für die Darstellung gestaucht: Größen und Abstände
 * im echten Verhältnis würden die inneren Planeten unsichtbar machen.
 * Die Umlaufzeiten (orbitDays) laufen dagegen im echten Verhältnis.
 */

export type PlanetType = 'rocky' | 'gas' | 'ice' | 'dwarf';

export type SurfaceKind = 'rocky' | 'banded' | 'earth';

export type Planet = {
  id: string;
  name: string;
  type: PlanetType;
  tagline: string;
  description: string[];
  facts: {
    diameterKm: number;
    distanceMioKm: number;
    orbitDays: number;
    orbitLabel: string;
    dayLabel: string;
    moons: number;
    meanTempC: number;
    /** Schwerkraft an der Oberfläche in m/s² */
    gravity: number;
  };
  scene: {
    radius: number;
    orbitRadius: number;
    /** Achsneigung in Grad */
    tiltDeg: number;
    /** Siderische Rotation in Stunden, negativ = rückläufig */
    rotationHours: number;
    /** Startwinkel auf der Bahn in Grad */
    startAngleDeg: number;
    surface: {
      kind: SurfaceKind;
      /** Drei Grundfarben des Farbverlaufs */
      colors: [string, string, string];
      rim: string;
      bandFreq?: number;
      bandContrast?: number;
      turbulence?: number;
      polarCaps?: number;
      /** Sturmfleck: Breite und Länge in Radiant, Größe, Stärke */
      spot?: { lat: number; lon: number; size: number; strength: number; color: string };
    };
    rings?: { inner: number; outer: number; colors: [string, string] };
    moon?: { radius: number; distance: number; periodDays: number };
  };
  /** Flache Farben für 2D-Vorschauen */
  swatch: { base: string; band?: string; ring?: string };
};

export const planetTypeLabel: Record<PlanetType, string> = {
  rocky: 'Gesteinsplanet',
  gas: 'Gasriese',
  ice: 'Eisriese',
  dwarf: 'Zwergplanet',
};

export const planetTypeGroupLabel: Record<PlanetType, string> = {
  rocky: 'Gesteinsplaneten',
  gas: 'Gasriesen',
  ice: 'Eisriesen',
  dwarf: 'Zwergplaneten',
};

export const planets: Planet[] = [
  {
    id: 'merkur',
    name: 'Merkur',
    type: 'rocky',
    tagline: 'Der kleinste Planet und der Sonne am nächsten.',
    description: [
      'Merkur hat kaum Atmosphäre, die Wärme hält sich deshalb nicht. Auf der Tagseite wird es über 400 °C heiß, auf der Nachtseite fällt die Temperatur auf etwa −180 °C.',
      'Seine Oberfläche ist von Kratern übersät und erinnert an unseren Mond. Für eine Runde um die Sonne braucht er nur 88 Tage.',
    ],
    facts: {
      diameterKm: 4879,
      distanceMioKm: 57.9,
      orbitDays: 87.97,
      orbitLabel: '88 Tage',
      dayLabel: '58,6 Tage',
      moons: 0,
      meanTempC: 167,
      gravity: 3.7,
    },
    scene: {
      radius: 0.34,
      orbitRadius: 6,
      tiltDeg: 0.03,
      rotationHours: 1407.6,
      startAngleDeg: 40,
      surface: { kind: 'rocky', colors: ['#9A938B', '#5C5853', '#C2B9AE'], rim: '#8A8580' },
    },
    swatch: { base: '#8C8680' },
  },
  {
    id: 'venus',
    name: 'Venus',
    type: 'rocky',
    tagline: 'Der heißeste Planet, verhüllt von dichten Wolken.',
    description: [
      'Eine Atmosphäre aus Kohlendioxid und Wolken aus Schwefelsäure hält die Hitze fest. Am Boden herrschen rund 464 °C, heißer als auf dem Merkur.',
      'Venus dreht sich rückwärts und sehr langsam: Ein Tag dauert dort länger als ein Jahr.',
    ],
    facts: {
      diameterKm: 12104,
      distanceMioKm: 108.2,
      orbitDays: 224.7,
      orbitLabel: '225 Tage',
      dayLabel: '243 Tage, rückläufig',
      moons: 0,
      meanTempC: 464,
      gravity: 8.9,
    },
    scene: {
      radius: 0.6,
      orbitRadius: 8.6,
      tiltDeg: 177.4,
      rotationHours: -5832.5,
      startAngleDeg: 200,
      surface: {
        kind: 'banded',
        colors: ['#E9D5A6', '#C7A56A', '#F4E8C8'],
        rim: '#F2D9A0',
        bandFreq: 7,
        bandContrast: 0.45,
        turbulence: 1.2,
      },
    },
    swatch: { base: '#DCC08A' },
  },
  {
    id: 'erde',
    name: 'Erde',
    type: 'rocky',
    tagline: 'Unser Zuhause und der einzige bekannte Ort mit Leben.',
    description: [
      'Rund 71 Prozent der Oberfläche sind von Wasser bedeckt. Die Atmosphäre aus Stickstoff und Sauerstoff schützt vor Strahlung und hält die Temperatur im Mittel bei etwa 15 °C.',
      'Die Achsneigung von 23,4 Grad sorgt für die Jahreszeiten. Der Mond stabilisiert diese Neigung.',
    ],
    facts: {
      diameterKm: 12742,
      distanceMioKm: 149.6,
      orbitDays: 365.26,
      orbitLabel: '365,25 Tage',
      dayLabel: '23 h 56 min',
      moons: 1,
      meanTempC: 15,
      gravity: 9.8,
    },
    scene: {
      radius: 0.64,
      orbitRadius: 11.6,
      tiltDeg: 23.4,
      rotationHours: 23.93,
      startAngleDeg: 110,
      surface: {
        kind: 'earth',
        colors: ['#1F5596', '#3F6E3B', '#9A8657'],
        rim: '#7DB8FF',
        polarCaps: 0.13,
      },
      // Gestauchter Abstand, echte Umlaufzeit von 27,3 Tagen
      moon: { radius: 0.17, distance: 1.25, periodDays: 27.32 },
    },
    swatch: { base: '#2F6DAE', band: '#3F6E3B' },
  },
  {
    id: 'mars',
    name: 'Mars',
    type: 'rocky',
    tagline: 'Der rote Planet mit dem höchsten Vulkan des Sonnensystems.',
    description: [
      'Eisenoxid im Staub färbt den Mars rot. Der Vulkan Olympus Mons ist etwa 22 Kilometer hoch, fast dreimal so hoch wie der Mount Everest.',
      'An beiden Polen liegen Kappen aus Wassereis und gefrorenem Kohlendioxid. Mars hat zwei kleine Monde, Phobos und Deimos.',
    ],
    facts: {
      diameterKm: 6779,
      distanceMioKm: 227.9,
      orbitDays: 686.98,
      orbitLabel: '687 Tage',
      dayLabel: '24 h 37 min',
      moons: 2,
      meanTempC: -65,
      gravity: 3.7,
    },
    scene: {
      radius: 0.44,
      orbitRadius: 14.6,
      tiltDeg: 25.2,
      rotationHours: 24.62,
      startAngleDeg: 300,
      surface: {
        kind: 'rocky',
        colors: ['#C9542A', '#7E3218', '#E3895A'],
        rim: '#E8A07A',
        polarCaps: 0.09,
      },
    },
    swatch: { base: '#B9532C' },
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    type: 'gas',
    tagline: 'Der größte Planet, mit einem Sturm größer als die Erde.',
    description: [
      'Jupiter hat mehr als die doppelte Masse aller anderen Planeten zusammen. Seine Streifen sind Wolkenbänder aus Ammoniak, die von starken Winden angetrieben werden.',
      'Der Große Rote Fleck ist ein Wirbelsturm, der seit mindestens 190 Jahren beobachtet wird. Ein Tag dauert hier keine zehn Stunden.',
    ],
    facts: {
      diameterKm: 139820,
      distanceMioKm: 778.5,
      orbitDays: 4332.59,
      orbitLabel: '11,86 Jahre',
      dayLabel: '9 h 56 min',
      moons: 97,
      meanTempC: -110,
      gravity: 23.1,
    },
    scene: {
      radius: 1.7,
      orbitRadius: 20.5,
      tiltDeg: 3.1,
      rotationHours: 9.93,
      startAngleDeg: 20,
      surface: {
        kind: 'banded',
        colors: ['#DCC6A6', '#A56C45', '#F0E7D8'],
        rim: '#E9D4B4',
        bandFreq: 15,
        bandContrast: 0.85,
        turbulence: 0.35,
        spot: { lat: -0.38, lon: 0.9, size: 0.16, strength: 0.85, color: '#B5543A' },
      },
    },
    swatch: { base: '#CDAE8A', band: '#A56C45' },
  },
  {
    id: 'saturn',
    name: 'Saturn',
    type: 'gas',
    tagline: 'Berühmt für sein Ringsystem aus Eis und Gestein.',
    description: [
      'Die Ringe sind über 270.000 Kilometer breit, aber meist nur rund zehn Meter dick. Sie bestehen aus unzähligen Brocken aus Wassereis.',
      'Saturn hat die geringste Dichte aller Planeten und mehr bekannte Monde als jeder andere. Der größte, Titan, hat eine dichte Atmosphäre.',
    ],
    facts: {
      diameterKm: 116460,
      distanceMioKm: 1432,
      orbitDays: 10759.22,
      orbitLabel: '29,46 Jahre',
      dayLabel: '10 h 33 min',
      moons: 274,
      meanTempC: -140,
      gravity: 9.0,
    },
    scene: {
      radius: 1.42,
      orbitRadius: 27,
      tiltDeg: 26.7,
      rotationHours: 10.66,
      startAngleDeg: 160,
      surface: {
        kind: 'banded',
        colors: ['#E6D4A8', '#C0A26A', '#F3E9CC'],
        rim: '#F0DFB4',
        bandFreq: 12,
        bandContrast: 0.5,
        turbulence: 0.25,
      },
      rings: { inner: 1.25, outer: 2.35, colors: ['#E8DCC0', '#A89878'] },
    },
    swatch: { base: '#D9C397', band: '#C0A26A', ring: '#CDBE9C' },
  },
  {
    id: 'uranus',
    name: 'Uranus',
    type: 'ice',
    tagline: 'Ein Eisriese, der auf der Seite liegend um die Sonne rollt.',
    description: [
      'Seine Achse ist um fast 98 Grad geneigt. Jeder Pol bekommt dadurch etwa 42 Jahre am Stück Sonnenlicht und danach 42 Jahre Dunkelheit.',
      'Methan in der Atmosphäre schluckt rotes Licht und lässt Uranus blassblau erscheinen.',
    ],
    facts: {
      diameterKm: 50724,
      distanceMioKm: 2867,
      orbitDays: 30688.5,
      orbitLabel: '84 Jahre',
      dayLabel: '17 h 14 min, rückläufig',
      moons: 29,
      meanTempC: -195,
      gravity: 8.7,
    },
    scene: {
      radius: 1.0,
      orbitRadius: 33,
      tiltDeg: 97.8,
      rotationHours: -17.24,
      startAngleDeg: 250,
      surface: {
        kind: 'banded',
        colors: ['#A3DCE3', '#80C4D0', '#C4ECEF'],
        rim: '#CDF4F7',
        bandFreq: 9,
        bandContrast: 0.18,
        turbulence: 0.2,
      },
    },
    swatch: { base: '#96D2DA' },
  },
  {
    id: 'neptun',
    name: 'Neptun',
    type: 'ice',
    tagline: 'Der äußerste Planet, mit den schnellsten Winden.',
    description: [
      'Auf Neptun wehen Winde mit bis zu 2.000 km/h, die stärksten im Sonnensystem. Er war der erste Planet, der zuerst berechnet und dann gefunden wurde.',
      'Für eine Runde um die Sonne braucht er fast 165 Jahre. Seit seiner Entdeckung 1846 hat er erst eine vollendet.',
    ],
    facts: {
      diameterKm: 49244,
      distanceMioKm: 4515,
      orbitDays: 60182,
      orbitLabel: '164,8 Jahre',
      dayLabel: '16 h 6 min',
      moons: 16,
      meanTempC: -200,
      gravity: 11.0,
    },
    scene: {
      radius: 0.98,
      orbitRadius: 38.5,
      tiltDeg: 28.3,
      rotationHours: 16.11,
      startAngleDeg: 80,
      surface: {
        kind: 'banded',
        colors: ['#3F68D8', '#2A48A6', '#7095F0'],
        rim: '#86AEFF',
        bandFreq: 10,
        bandContrast: 0.35,
        turbulence: 0.4,
        spot: { lat: -0.35, lon: -1.2, size: 0.12, strength: 0.6, color: '#1C2F78' },
      },
    },
    swatch: { base: '#3D64CF' },
  },
];

/**
 * Zwergplaneten. Bewusst nicht in `planets` und `bodies`: Sie hängen nur im
 * Schaukasten, nicht im 3D-System und nicht in der Planetenliste.
 * Werte: NASA Planetary Fact Sheet / Solar System Exploration.
 */
export const dwarfPlanets: Planet[] = [
  {
    id: 'ceres',
    name: 'Ceres',
    type: 'dwarf',
    tagline: 'Der größte Brocken im Asteroidengürtel, rund genug für einen Zwergplaneten.',
    description: [
      'Ceres kreist zwischen Mars und Jupiter und macht allein etwa ein Viertel der Masse des ganzen Asteroidengürtels aus.',
      'Die Raumsonde Dawn entdeckte im Krater Occator helle Flecken aus Salz. Darunter liegt vermutlich salziges Wasser.',
    ],
    facts: {
      diameterKm: 939,
      distanceMioKm: 413.7,
      orbitDays: 1680,
      orbitLabel: '4,6 Jahre',
      dayLabel: '9 h 4 min',
      moons: 0,
      meanTempC: -105,
      gravity: 0.28,
    },
    scene: {
      radius: 0.18,
      orbitRadius: 17.2,
      tiltDeg: 4,
      rotationHours: 9.07,
      startAngleDeg: 60,
      surface: {
        kind: 'rocky',
        colors: ['#8C8780', '#5E5A55', '#B9B3AA'],
        rim: '#A9A49C',
      },
    },
    swatch: { base: '#8A857E' },
  },
  {
    id: 'pluto',
    name: 'Pluto',
    type: 'dwarf',
    tagline: 'Ganz draußen, mit einem riesigen hellen Herz aus Stickstoffeis.',
    description: [
      'Pluto galt bis 2006 als neunter Planet. Er braucht 248 Jahre für eine Runde um die Sonne und kommt ihr dabei mal näher als Neptun.',
      'Die Sonde New Horizons fotografierte 2015 die helle, herzförmige Ebene Tombaugh Regio. Sein Mond Charon ist halb so groß wie Pluto selbst.',
    ],
    facts: {
      diameterKm: 2377,
      distanceMioKm: 5906.4,
      orbitDays: 90560,
      orbitLabel: '248 Jahre',
      dayLabel: '6 d 9 h',
      moons: 5,
      meanTempC: -225,
      gravity: 0.62,
    },
    scene: {
      radius: 0.22,
      orbitRadius: 46,
      tiltDeg: 122.5,
      rotationHours: -153.3,
      startAngleDeg: 200,
      surface: {
        // Gebändert nur, weil das Herz als Fleck dort gerechnet wird; Bänder kaum sichtbar
        kind: 'banded',
        colors: ['#BFA285', '#9A7A5E', '#D9C7AE'],
        rim: '#E0CDB6',
        bandFreq: 3,
        bandContrast: 0.12,
        turbulence: 0.8,
        spot: { lat: 0.1, lon: 0.4, size: 0.7, strength: 0.9, color: '#F1E9DC' },
      },
    },
    swatch: { base: '#BFA488', band: '#EDE3D3' },
  },
];

export const isDwarf = (b: Body | null | undefined) => !!b && b.type === 'dwarf';

export const sun = { radius: 3.2 };

export type Star = {
  id: 'sonne';
  name: string;
  type: 'star';
  tagline: string;
  description: string[];
  facts: {
    diameterKm: number;
    surfaceTempC: number;
    coreTempMioC: number;
    ageMrdYears: number;
    massShare: string;
    rotationLabel: string;
    lightToEarth: string;
    gravity: number;
  };
  scene: { radius: number };
  swatch: { base: string; band?: string; ring?: string };
};

/** Die Sonne. Daten: NASA Sun Fact Sheet. */
export const sunBody: Star = {
  id: 'sonne',
  name: 'Sonne',
  type: 'star',
  tagline: 'Der Stern im Zentrum, um den alles kreist.',
  description: [
    'Die Sonne ist ein Stern aus Wasserstoff und Helium. In ihrem Kern verschmilzt Wasserstoff zu Helium, dabei entsteht die Energie, die als Licht und Wärme bis zu uns gelangt.',
    'Sie vereint 99,86 Prozent der gesamten Masse des Sonnensystems. Ihr Licht braucht bis zur Erde gut acht Minuten.',
  ],
  facts: {
    diameterKm: 1391400,
    surfaceTempC: 5500,
    coreTempMioC: 15,
    ageMrdYears: 4.6,
    massShare: '99,86 %',
    rotationLabel: '25 Tage am Äquator',
    lightToEarth: '8 min 19 s',
    gravity: 274,
  },
  scene: { radius: sun.radius },
  swatch: { base: '#F5B544' },
};

/** Alles, was man auswählen kann: Sonne und Planeten */
export type Body = Planet | Star;

export const bodies: Body[] = [sunBody, ...planets];

export const isPlanet = (b: Body | null | undefined): b is Planet => !!b && b.type !== 'star';

export function getPlanet(id: string | undefined): Planet | undefined {
  return planets.find((p) => p.id === id);
}

export function getBody(id: string | undefined): Body | undefined {
  return bodies.find((b) => b.id === id);
}

/** Wie getBody, kennt aber auch die Zwergplaneten (nur Schaukasten) */
export function getBoxBody(id: string | undefined): Body | undefined {
  return getBody(id) ?? dwarfPlanets.find((b) => b.id === id);
}

export const bodyTypeLabel = (b: Body) => (b.type === 'star' ? 'Stern' : planetTypeLabel[b.type]);

const nf = new Intl.NumberFormat('de-DE');

export function formatKm(km: number) {
  return `${nf.format(km)} km`;
}

export function formatDistance(mioKm: number) {
  if (mioKm >= 1000) {
    return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(mioKm / 1000)} Mrd. km`;
  }
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(mioKm)} Mio. km`;
}

export function formatTemp(c: number) {
  return `${c < 0 ? '−' : ''}${Math.abs(c)} °C`;
}

export type FactItem = { label: string; value: string };

const de = (n: number, digits = 1) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);

/** Drei Kennzahlen für die Infokarte */
export function quickFacts(b: Body): FactItem[] {
  if (b.type === 'star') {
    return [
      { label: 'Durchmesser', value: formatKm(b.facts.diameterKm) },
      { label: 'Oberfläche', value: `${de(b.facts.surfaceTempC)} °C` },
      { label: 'Alter', value: `${de(b.facts.ageMrdYears)} Mrd. J.` },
    ];
  }
  return [
    { label: 'Durchmesser', value: formatKm(b.facts.diameterKm) },
    { label: 'Umlaufzeit', value: b.facts.orbitLabel },
    { label: 'Monde', value: String(b.facts.moons) },
  ];
}

/** Sechs Kennzahlen für die Detailseite */
export function detailFacts(b: Body): FactItem[] {
  if (b.type === 'star') {
    const f = b.facts;
    return [
      { label: 'Durchmesser', value: formatKm(f.diameterKm) },
      { label: 'Anteil an der Gesamtmasse', value: f.massShare },
      { label: 'Temperatur an der Oberfläche', value: `${de(f.surfaceTempC)} °C` },
      { label: 'Temperatur im Kern', value: `${de(f.coreTempMioC)} Mio. °C` },
      { label: 'Rotation', value: f.rotationLabel },
      { label: 'Licht bis zur Erde', value: f.lightToEarth },
    ];
  }
  const f = b.facts;
  return [
    { label: 'Durchmesser', value: formatKm(f.diameterKm) },
    { label: 'Abstand zur Sonne', value: formatDistance(f.distanceMioKm) },
    { label: 'Umlaufzeit', value: f.orbitLabel },
    { label: 'Tageslänge', value: f.dayLabel },
    { label: 'Monde', value: String(f.moons) },
    { label: 'Mittlere Temperatur', value: formatTemp(f.meanTempC) },
  ];
}

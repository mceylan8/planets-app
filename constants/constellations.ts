/**
 * Sternbilder für den Sternenkasten, als Bastelvorlage vereinfacht:
 * Sternpositionen grob im Bereich -1..1 (x nach rechts, y nach oben),
 * Linien als Paare von Stern-Indizes. Formen stimmen ungefähr, Abstände nicht.
 */
export type Constellation = {
  id: string;
  name: string;
  /** Ein Satz zum Vorlesen beim Antippen */
  fact: string;
  zodiac: boolean;
  /** [x, y, Helligkeit 0..1] */
  stars: [number, number, number][];
  lines: [number, number][];
};

const chain = (n: number): [number, number][] =>
  Array.from({ length: n - 1 }, (_, i) => [i, i + 1] as [number, number]);

export const constellations: Constellation[] = [
  {
    id: 'orion',
    name: 'Orion',
    fact: 'Der Himmelsjäger. Seine drei Gürtelsterne findet man im Winter sofort.',
    zodiac: false,
    stars: [
      [-0.5, 0.8, 1], [0.5, 0.7, 0.8], [-0.15, 0, 0.7], [0, -0.05, 0.7],
      [0.15, -0.1, 0.7], [-0.45, -0.8, 0.6], [0.5, -0.85, 1], [0, 1, 0.4],
    ],
    lines: [[7, 0], [7, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
  },
  {
    id: 'grosser-wagen',
    name: 'Großer Wagen',
    fact: 'Eigentlich nur ein Teil des Großen Bären. Er zeigt den Weg zum Polarstern.',
    zodiac: false,
    stars: [
      [-1, 0.2, 0.7], [-0.6, 0.35, 0.8], [-0.25, 0.3, 0.8], [0.05, 0.1, 0.5],
      [0.1, -0.3, 0.8], [0.7, -0.35, 0.9], [0.75, 0.05, 0.9],
    ],
    lines: [...chain(7), [6, 3]],
  },
  {
    id: 'kleiner-wagen',
    name: 'Kleiner Wagen',
    fact: 'An seiner Deichsel sitzt der Polarstern, er steht fast genau im Norden.',
    zodiac: false,
    stars: [
      [-1, 0.6, 1], [-0.6, 0.3, 0.4], [-0.3, 0.1, 0.4], [0, -0.1, 0.5],
      [0.5, -0.1, 0.5], [0.6, -0.5, 0.8], [0.1, -0.5, 0.5],
    ],
    lines: [...chain(7), [6, 3]],
  },
  {
    id: 'kassiopeia',
    name: 'Kassiopeia',
    fact: 'Das große W am Himmel, im Norden das ganze Jahr zu sehen.',
    zodiac: false,
    stars: [[-1, 0.3, 0.7], [-0.5, -0.3, 0.8], [0, 0.1, 0.8], [0.5, -0.4, 0.6], [1, 0.2, 0.6]],
    lines: chain(5),
  },
  {
    id: 'schwan',
    name: 'Schwan',
    fact: 'Ein Kreuz, das durch die Milchstraße fliegt. Deneb ist sein Schwanz.',
    zodiac: false,
    stars: [[0, 1, 1], [0, 0.3, 0.6], [0, -0.9, 0.6], [-0.7, 0.2, 0.5], [0.7, 0.4, 0.5]],
    lines: [[0, 1], [1, 2], [3, 1], [1, 4]],
  },
  {
    id: 'leier',
    name: 'Leier',
    fact: 'Klein, aber mit Wega, einem der hellsten Sterne am Sommerhimmel.',
    zodiac: false,
    stars: [[0, 0.9, 1], [-0.25, 0.3, 0.4], [0.25, 0.35, 0.4], [-0.35, -0.6, 0.5], [0.15, -0.55, 0.5]],
    lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]],
  },
  {
    id: 'adler',
    name: 'Adler',
    fact: 'Sein Hauptstern Atair bildet mit Wega und Deneb das Sommerdreieck.',
    zodiac: false,
    stars: [[0, 0.1, 1], [-0.15, 0.3, 0.5], [0.15, -0.1, 0.5], [-0.9, 0.5, 0.4], [0.8, -0.4, 0.4], [0.1, -0.9, 0.4]],
    lines: [[1, 0], [0, 2], [0, 3], [0, 4], [2, 5]],
  },
  {
    id: 'pegasus',
    name: 'Pegasus',
    fact: 'Das geflügelte Pferd. Sein großes Viereck ist im Herbst leicht zu finden.',
    zodiac: false,
    stars: [
      [-0.5, 0.5, 0.7], [0.4, 0.5, 0.7], [0.4, -0.4, 0.7], [-0.5, -0.4, 0.7],
      [0.8, -0.6, 0.4], [1, -0.3, 0.5], [0.8, 0.8, 0.4],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [1, 6]],
  },
  {
    id: 'andromeda',
    name: 'Andromeda',
    fact: 'Hier liegt die Andromeda-Galaxie, das fernste, was man ohne Fernrohr sieht.',
    zodiac: false,
    stars: [[-1, -0.3, 0.7], [-0.4, 0, 0.7], [0.2, 0.3, 0.8], [0.9, 0.5, 0.6], [-0.2, 0.4, 0.4]],
    lines: [[0, 1], [1, 2], [2, 3], [1, 4]],
  },
  {
    id: 'perseus',
    name: 'Perseus',
    fact: 'Der Held mit dem Medusenkopf. Im August regnen aus ihm Sternschnuppen.',
    zodiac: false,
    stars: [[0, 0.9, 0.5], [0.1, 0.3, 0.8], [-0.4, -0.1, 0.5], [-0.6, -0.7, 0.4], [0.5, -0.2, 0.5], [0.6, -0.8, 0.4]],
    lines: [[0, 1], [1, 2], [2, 3], [1, 4], [4, 5]],
  },
  {
    id: 'grosser-hund',
    name: 'Großer Hund',
    fact: 'Hier funkelt Sirius, der hellste Stern am ganzen Nachthimmel.',
    zodiac: false,
    stars: [[0, 0.7, 1], [0.4, 0.6, 0.4], [-0.1, 0.2, 0.4], [-0.3, -0.4, 0.6], [0.3, -0.5, 0.6], [-0.6, -0.8, 0.5]],
    lines: [[1, 0], [0, 2], [2, 3], [3, 4], [3, 5]],
  },
  {
    id: 'kleiner-hund',
    name: 'Kleiner Hund',
    fact: 'Nur zwei Sterne, einer davon ist der helle Prokyon.',
    zodiac: false,
    stars: [[-0.4, -0.2, 1], [0.4, 0.3, 0.5]],
    lines: [[0, 1]],
  },
  {
    id: 'fuhrmann',
    name: 'Fuhrmann',
    fact: 'Ein Fünfeck hoch im Winter, mit der goldgelben Kapella.',
    zodiac: false,
    stars: [[0, 0.9, 1], [-0.7, 0.4, 0.5], [-0.6, -0.5, 0.5], [0.4, -0.7, 0.5], [0.7, 0.2, 0.5]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
  },
  {
    id: 'baerenhueter',
    name: 'Bärenhüter',
    fact: 'Wie ein Drachen am Himmel. Arktur unten ist orange und sehr hell.',
    zodiac: false,
    stars: [[0, -0.9, 1], [-0.35, -0.2, 0.5], [-0.3, 0.5, 0.4], [0.05, 0.9, 0.4], [0.35, 0.4, 0.4], [0.3, -0.3, 0.5]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 'herkules',
    name: 'Herkules',
    fact: 'In seinem Trapez versteckt sich ein Kugelsternhaufen aus Hunderttausenden Sternen.',
    zodiac: false,
    stars: [
      [-0.3, 0.3, 0.5], [0.3, 0.35, 0.5], [0.35, -0.25, 0.5], [-0.25, -0.3, 0.5],
      [-0.6, 0.9, 0.4], [0.7, 0.9, 0.4], [-0.6, -0.9, 0.4], [0.7, -0.8, 0.4],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 5], [3, 6], [2, 7]],
  },
  {
    id: 'drache',
    name: 'Drache',
    fact: 'Schlängelt sich zwischen den beiden Wagen um den Himmelsnordpol.',
    zodiac: false,
    stars: [
      [-1, -0.6, 0.4], [-0.6, -0.4, 0.4], [-0.3, -0.6, 0.4], [0, -0.2, 0.5], [-0.1, 0.3, 0.4],
      [0.3, 0.5, 0.4], [0.6, 0.6, 0.6], [0.9, 0.9, 0.5], [0.7, 0.95, 0.4], [0.5, 0.8, 0.4],
    ],
    lines: [...chain(8), [7, 8], [8, 9], [9, 6]],
  },
  {
    id: 'krone',
    name: 'Nördliche Krone',
    fact: 'Ein kleiner Halbkreis aus Sternen, wie ein Diadem.',
    zodiac: false,
    stars: [[-0.8, 0.3, 0.4], [-0.5, -0.2, 0.4], [-0.1, -0.4, 0.8], [0.3, -0.3, 0.4], [0.6, 0, 0.4], [0.8, 0.4, 0.4]],
    lines: chain(6),
  },
  {
    id: 'delfin',
    name: 'Delfin',
    fact: 'Ein winziger springender Delfin neben der Milchstraße.',
    zodiac: false,
    stars: [[-0.2, 0.3, 0.5], [0.2, 0.4, 0.5], [0.25, 0, 0.5], [-0.15, -0.05, 0.5], [-0.5, -0.6, 0.4]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4]],
  },
  {
    id: 'kepheus',
    name: 'Kepheus',
    fact: 'Der König neben Kassiopeia, geformt wie ein kleines Haus.',
    zodiac: false,
    stars: [[0, 0.9, 0.5], [-0.5, 0.2, 0.5], [0.5, 0.2, 0.6], [-0.4, -0.6, 0.5], [0.4, -0.6, 0.5]],
    lines: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [3, 4]],
  },
  {
    id: 'kreuz-des-suedens',
    name: 'Kreuz des Südens',
    fact: 'Das kleinste Sternbild, nur von der Südhalbkugel aus zu sehen.',
    zodiac: false,
    stars: [[0, 0.8, 0.8], [0, -0.8, 1], [-0.5, 0.1, 0.7], [0.45, 0.2, 0.6]],
    lines: [[0, 1], [2, 3]],
  },
  {
    id: 'widder',
    name: 'Widder',
    fact: 'Ein kleiner gebogener Strich, das erste Tierkreiszeichen.',
    zodiac: true,
    stars: [[-1, 0.2, 0.4], [-0.2, 0.5, 0.8], [0.4, 0.6, 0.6], [0.8, 0.4, 0.4]],
    lines: chain(4),
  },
  {
    id: 'stier',
    name: 'Stier',
    fact: 'Das rote Auge Aldebaran leuchtet im V-förmigen Stierkopf.',
    zodiac: true,
    stars: [
      [0, 0, 1], [-0.3, 0.2, 0.5], [-0.5, 0.45, 0.4], [0.3, 0.25, 0.5],
      [0.6, 0.5, 0.4], [-0.9, 0.8, 0.7], [0.9, 0.9, 0.6],
    ],
    lines: [[0, 1], [1, 2], [2, 5], [0, 3], [3, 4], [4, 6]],
  },
  {
    id: 'zwillinge',
    name: 'Zwillinge',
    fact: 'Kastor und Pollux, zwei helle Sterne nebeneinander wie Brüder.',
    zodiac: true,
    stars: [
      [-0.4, 1, 0.8], [-0.5, 0.3, 0.4], [-0.6, -0.5, 0.5],
      [0.3, 1, 1], [0.2, 0.3, 0.4], [0.1, -0.6, 0.5],
    ],
    lines: [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3]],
  },
  {
    id: 'krebs',
    name: 'Krebs',
    fact: 'Sehr blass, aber in seiner Mitte schimmert der Sternhaufen Krippe.',
    zodiac: true,
    stars: [[0, 0, 0.4], [0, 0.7, 0.4], [-0.6, -0.6, 0.5], [0.6, -0.5, 0.4]],
    lines: [[0, 1], [0, 2], [0, 3]],
  },
  {
    id: 'loewe',
    name: 'Löwe',
    fact: 'Sein Kopf ist ein umgedrehtes Fragezeichen, Regulus sitzt an der Brust.',
    zodiac: true,
    stars: [
      [-1, -0.1, 0.6], [-0.2, 0, 0.5], [0.3, 0.1, 1], [0.4, 0.5, 0.5],
      [0.2, 0.8, 0.5], [-0.1, 0.7, 0.4], [-0.3, 0.35, 0.5],
    ],
    lines: [...chain(6), [1, 6], [0, 6]],
  },
  {
    id: 'jungfrau',
    name: 'Jungfrau',
    fact: 'Das größte Tierkreis-Sternbild. Ihr hellster Stern heißt Spica, die Ähre.',
    zodiac: true,
    stars: [
      [-1, 0.3, 0.4], [-0.5, 0.1, 0.5], [0, 0, 0.6], [0.4, 0.3, 0.4],
      [0.9, 0.6, 0.4], [0.2, -0.5, 0.5], [0.6, -0.9, 1],
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6]],
  },
  {
    id: 'waage',
    name: 'Waage',
    fact: 'Das einzige Tierkreiszeichen, das kein Lebewesen ist.',
    zodiac: true,
    stars: [[0, 0.8, 0.6], [-0.6, 0.1, 0.6], [0.6, 0.1, 0.5], [-0.5, -0.7, 0.4]],
    lines: [[0, 1], [0, 2], [1, 2], [1, 3]],
  },
  {
    id: 'skorpion',
    name: 'Skorpion',
    fact: 'Ein langer Haken mit dem roten Riesenstern Antares im Herzen.',
    zodiac: true,
    stars: [
      [-1, 0.8, 0.5], [-0.8, 0.5, 0.6], [-0.6, 0.3, 1], [-0.3, 0, 0.5],
      [-0.1, -0.4, 0.5], [0.2, -0.7, 0.5], [0.6, -0.8, 0.5], [0.9, -0.5, 0.7],
      [0.8, -0.2, 0.6],
    ],
    lines: chain(9),
  },
  {
    id: 'schuetze',
    name: 'Schütze',
    fact: 'Sieht aus wie eine Teekanne. Dahinter liegt die Mitte der Milchstraße.',
    zodiac: true,
    stars: [
      [-0.6, -0.3, 0.6], [-0.6, 0.3, 0.6], [0, 0.4, 0.5], [0.3, 0.7, 0.5],
      [0.6, 0.3, 0.6], [0.6, -0.3, 0.7], [0, -0.4, 0.5],
    ],
    lines: [...chain(7), [6, 0], [2, 6]],
  },
  {
    id: 'steinbock',
    name: 'Steinbock',
    fact: 'Ein flaches Dreieck, halb Ziege, halb Fisch.',
    zodiac: true,
    stars: [[-1, 0.4, 0.5], [0, -0.6, 0.4], [1, 0.5, 0.6], [0.3, 0.3, 0.4]],
    lines: [[0, 1], [1, 2], [2, 3], [3, 0]],
  },
  {
    id: 'wassermann',
    name: 'Wassermann',
    fact: 'Der Wasserträger, der aus seinem Krug einen Sternenfluss gießt.',
    zodiac: true,
    stars: [
      [-1, 0.6, 0.5], [-0.5, 0.4, 0.6], [0, 0.5, 0.5], [0.3, 0.1, 0.4],
      [0.6, -0.3, 0.4], [0.2, -0.8, 0.5],
    ],
    lines: chain(6),
  },
  {
    id: 'fische',
    name: 'Fische',
    fact: 'Zwei Fische, an den Schwänzen mit einem langen Band verknotet.',
    zodiac: true,
    stars: [
      [-1, 0.8, 0.4], [-0.5, 0.3, 0.4], [0, -0.6, 0.5], [0.5, -0.3, 0.4],
      [1, -0.1, 0.4], [0.9, 0.2, 0.4], [0.7, 0.1, 0.4],
    ],
    lines: [...chain(5), [4, 5], [5, 6], [6, 4]],
  },
];

export const zodiac = constellations.filter((c) => c.zodiac);
export const famous = constellations.filter((c) => !c.zodiac);

/* ---------- Steckbriefe ---------- */

/** Wann das Sternbild abends am besten zu sehen ist (Mitteleuropa) */
export type Season = 'ganzjaehrig' | 'fruehling' | 'sommer' | 'herbst' | 'winter' | 'sueden';

export const seasonLabel: Record<Season, string> = {
  ganzjaehrig: 'Das ganze Jahr',
  fruehling: 'Frühling',
  sommer: 'Sommer',
  herbst: 'Herbst',
  winter: 'Winter',
  sueden: 'Nur vom Süden der Erde aus',
};

export const seasonOrder: Season[] = ['ganzjaehrig', 'winter', 'fruehling', 'sommer', 'herbst', 'sueden'];

export type StarNote = { name: string; distance: string; note: string };

export type ConstellationDetails = {
  latin: string;
  abbr: string;
  season: Season;
  /** Kurzer Untertitel für Listen */
  tagline: string;
  stars: StarNote[];
  myth: string;
  find: string;
};

/**
 * Entfernungen gerundet in Lichtjahren (Lj). Wo die Messungen weit
 * auseinandergehen, steht „rund“.
 */
export const details: Record<string, ConstellationDetails> = {
  orion: {
    latin: 'Orion', abbr: 'Ori', season: 'winter', tagline: 'Der Himmelsjäger',
    stars: [
      { name: 'Rigel', distance: 'rund 860 Lj', note: 'Blauweißer Riese, der linke Fuß des Jägers' },
      { name: 'Beteigeuze', distance: 'rund 550 Lj', note: 'Roter Überriese. An Stelle der Sonne würde er bis über die Marsbahn reichen' },
    ],
    myth: 'Der Jäger Orion wurde von einem Skorpion gestochen. Deshalb stehen die beiden nie gleichzeitig am Himmel: Geht der Skorpion auf, geht Orion unter.',
    find: 'Drei helle Sterne in einer Reihe bilden den Gürtel. Im Winter abends im Süden kaum zu übersehen.',
  },
  'grosser-wagen': {
    latin: 'Ursa Major', abbr: 'UMa', season: 'ganzjaehrig', tagline: 'Zeigt zum Polarstern',
    stars: [
      { name: 'Alioth', distance: '83 Lj', note: 'Hellster Stern des Wagens, an der Deichsel' },
      { name: 'Dubhe', distance: 'rund 120 Lj', note: 'Oben an der Hinterachse' },
    ],
    myth: 'Der Wagen ist der Rücken und Schwanz des Großen Bären. Die Sage erzählt von Kallisto, die in eine Bärin verwandelt und an den Himmel gesetzt wurde.',
    find: 'Verlängere die Hinterachse etwa fünfmal nach oben, dann triffst du den Polarstern.',
  },
  'kleiner-wagen': {
    latin: 'Ursa Minor', abbr: 'UMi', season: 'ganzjaehrig', tagline: 'Mit dem Polarstern',
    stars: [
      { name: 'Polaris', distance: 'rund 430 Lj', note: 'Der Polarstern. Er steht fast genau über dem Nordpol, alles scheint sich um ihn zu drehen' },
      { name: 'Kochab', distance: 'rund 130 Lj', note: 'Orange, an der Hinterachse' },
    ],
    myth: 'Der Kleine Bär ist Arkas, der Sohn der Kallisto. Er bekam seinen Platz am Himmel ganz nah bei seiner Mutter.',
    find: 'Polaris am Ende der Deichsel findest du über den Großen Wagen.',
  },
  kassiopeia: {
    latin: 'Cassiopeia', abbr: 'Cas', season: 'ganzjaehrig', tagline: 'Das große W',
    stars: [
      { name: 'Schedar', distance: 'rund 230 Lj', note: 'Orangefarbener Riese' },
      { name: 'Caph', distance: '55 Lj', note: 'Weißer Stern am Rand des W' },
    ],
    myth: 'Die eitle Königin prahlte, sie sei schöner als die Meeresnymphen. Zur Strafe sitzt sie auf einem Thron, der um den Pol kreist und manchmal kopfsteht.',
    find: 'Gegenüber vom Großen Wagen, auf der anderen Seite des Polarsterns.',
  },
  schwan: {
    latin: 'Cygnus', abbr: 'Cyg', season: 'sommer', tagline: 'Fliegt durch die Milchstraße',
    stars: [
      { name: 'Deneb', distance: 'rund 2600 Lj', note: 'Einer der leuchtkräftigsten Sterne, die man mit bloßem Auge sieht' },
      { name: 'Albireo', distance: 'rund 430 Lj', note: 'Im Fernglas ein Doppelstern, golden und blau' },
    ],
    myth: 'Göttervater Zeus soll sich in einen Schwan verwandelt haben. Seit dem steht der Schwan mit ausgebreiteten Flügeln am Himmel.',
    find: 'Deneb ist eine Ecke des Sommerdreiecks, zusammen mit Wega und Atair.',
  },
  leier: {
    latin: 'Lyra', abbr: 'Lyr', season: 'sommer', tagline: 'Klein, mit der hellen Wega',
    stars: [
      { name: 'Wega', distance: '25 Lj', note: 'Fünfthellster Stern am Himmel, bläulich weiß' },
    ],
    myth: 'Das ist die Leier des Sängers Orpheus. Mit seiner Musik konnte er sogar Steine und Tiere bezaubern.',
    find: 'Im Sommer abends fast direkt über dir, der hellste Stern weit oben.',
  },
  adler: {
    latin: 'Aquila', abbr: 'Aql', season: 'sommer', tagline: 'Mit Atair im Sommerdreieck',
    stars: [
      { name: 'Atair', distance: '17 Lj', note: 'Dreht sich so schnell, dass er an den Seiten abgeplattet ist' },
    ],
    myth: 'Der Adler trug die Blitze des Zeus.',
    find: 'Atair hat links und rechts je einen schwächeren Begleiter, wie drei Perlen.',
  },
  pegasus: {
    latin: 'Pegasus', abbr: 'Peg', season: 'herbst', tagline: 'Das geflügelte Pferd',
    stars: [
      { name: 'Enif', distance: 'rund 690 Lj', note: 'Die Nase des Pferdes, ein orangefarbener Überriese' },
      { name: 'Scheat', distance: 'rund 200 Lj', note: 'Roter Riese an einer Ecke des Vierecks' },
    ],
    myth: 'Pegasus entsprang dem Blut der Medusa, als Perseus sie besiegte.',
    find: 'Das große Herbstviereck: vier Sterne, die ein fast perfektes Quadrat bilden.',
  },
  andromeda: {
    latin: 'Andromeda', abbr: 'And', season: 'herbst', tagline: 'Mit der Nachbargalaxie',
    stars: [
      { name: 'Alpheratz', distance: '97 Lj', note: 'Teilt sich das Herbstviereck mit dem Pegasus' },
      { name: 'Andromeda-Galaxie', distance: '2,5 Millionen Lj', note: 'Das fernste Ding, das man ohne Fernrohr sehen kann, als blasses Fleckchen' },
    ],
    myth: 'Die Prinzessin wurde an einen Felsen gekettet, um ein Seeungeheuer zu besänftigen. Perseus kam vorbei und rettete sie.',
    find: 'Sie hängt an der linken oberen Ecke des Pegasus-Vierecks.',
  },
  perseus: {
    latin: 'Perseus', abbr: 'Per', season: 'herbst', tagline: 'Der Held mit dem Medusenkopf',
    stars: [
      { name: 'Mirfak', distance: 'rund 510 Lj', note: 'Gelblich weißer Überriese' },
      { name: 'Algol', distance: '90 Lj', note: 'Der „Dämonenstern“: wird alle 2,9 Tage für ein paar Stunden dunkler, weil ihn ein Begleiter verdeckt' },
    ],
    myth: 'Perseus besiegte die Medusa, deren Blick alles zu Stein werden ließ. Algol ist das Auge der Medusa.',
    find: 'Zwischen Kassiopeia und dem Siebengestirn. Im August kommen aus ihm die Perseiden.',
  },
  'grosser-hund': {
    latin: 'Canis Major', abbr: 'CMa', season: 'winter', tagline: 'Mit Sirius, dem hellsten Stern',
    stars: [
      { name: 'Sirius', distance: '8,6 Lj', note: 'Der hellste Stern am ganzen Nachthimmel' },
    ],
    myth: 'Der große Jagdhund folgt seinem Herrn Orion über den Himmel.',
    find: 'Verlängere den Orion-Gürtel nach links unten, dann triffst du Sirius.',
  },
  'kleiner-hund': {
    latin: 'Canis Minor', abbr: 'CMi', season: 'winter', tagline: 'Zwei Sterne mit Prokyon',
    stars: [
      { name: 'Prokyon', distance: '11,5 Lj', note: 'Einer unserer nahen Nachbarn. Der Name heißt „vor dem Hund“, er geht kurz vor Sirius auf' },
    ],
    myth: 'Der zweite, kleinere Hund des Jägers Orion.',
    find: 'Prokyon, Sirius und Beteigeuze bilden zusammen das Wintersechseck mit einem großen Dreieck darin.',
  },
  fuhrmann: {
    latin: 'Auriga', abbr: 'Aur', season: 'winter', tagline: 'Fünfeck mit Kapella',
    stars: [
      { name: 'Kapella', distance: '43 Lj', note: 'Eigentlich zwei gelbe Riesensterne, die sich eng umkreisen' },
    ],
    myth: 'Der Fuhrmann soll den Wagen mit vier Pferden erfunden haben. Kapella heißt „kleine Ziege“, er trägt sie im Arm.',
    find: 'Im Winter abends fast senkrecht über dir, der helle gelbliche Stern.',
  },
  baerenhueter: {
    latin: 'Bootes', abbr: 'Boo', season: 'fruehling', tagline: 'Treibt die Bären um den Pol',
    stars: [
      { name: 'Arktur', distance: '37 Lj', note: 'Orangefarbener Riese, hellster Stern am Nordhimmel' },
    ],
    myth: 'Der Bärenhüter treibt den Großen und den Kleinen Bären um den Himmelspol.',
    find: 'Folge dem Bogen der Wagendeichsel weiter: „Bogen zum Arktur“.',
  },
  herkules: {
    latin: 'Hercules', abbr: 'Her', season: 'sommer', tagline: 'Mit einem riesigen Sternhaufen',
    stars: [
      { name: 'Kornephoros', distance: 'rund 140 Lj', note: 'Gelber Riese, hellster Stern des Herkules' },
      { name: 'Kugelsternhaufen M13', distance: 'rund 22 000 Lj', note: 'Hunderttausende Sterne in einer Kugel, im Fernglas ein Wattebausch' },
    ],
    myth: 'Der stärkste Held der Sagen, berühmt für seine zwölf Aufgaben.',
    find: 'Zwischen Wega und Arktur. Sein Rumpf ist ein Viereck, der „Schlussstein“.',
  },
  drache: {
    latin: 'Draco', abbr: 'Dra', season: 'ganzjaehrig', tagline: 'Schlängelt sich um den Pol',
    stars: [
      { name: 'Eltanin', distance: 'rund 150 Lj', note: 'Orangefarbener Riese im Drachenkopf' },
      { name: 'Thuban', distance: 'rund 300 Lj', note: 'Vor etwa 4700 Jahren war er der Polarstern, als die Pyramiden gebaut wurden' },
    ],
    myth: 'Der Drache bewachte im Garten der Hesperiden die goldenen Äpfel.',
    find: 'Sein Kopf ist ein kleines Viereck nicht weit von der Wega.',
  },
  krone: {
    latin: 'Corona Borealis', abbr: 'CrB', season: 'fruehling', tagline: 'Ein Halbkreis wie ein Diadem',
    stars: [
      { name: 'Gemma', distance: '75 Lj', note: 'Das Juwel in der Mitte der Krone' },
    ],
    myth: 'Die Krone der Ariadne, die dem Helden Theseus mit einem Faden aus dem Labyrinth half.',
    find: 'Ein kleiner Bogen aus Sternen links neben Arktur.',
  },
  delfin: {
    latin: 'Delphinus', abbr: 'Del', season: 'sommer', tagline: 'Springt neben der Milchstraße',
    stars: [
      { name: 'Sualocin', distance: 'rund 240 Lj', note: 'Rückwärts gelesen: Nicolaus' },
      { name: 'Rotanev', distance: 'rund 100 Lj', note: 'Rückwärts gelesen: Venator. Ein Astronom versteckte so seinen Namen am Himmel' },
    ],
    myth: 'Der Delfin brachte die Meeresnymphe Amphitrite zu Poseidon, der sie heiraten wollte.',
    find: 'Ein winziges Rautenviereck mit Schwanz, links oberhalb von Atair.',
  },
  kepheus: {
    latin: 'Cepheus', abbr: 'Cep', season: 'ganzjaehrig', tagline: 'Der König wie ein Häuschen',
    stars: [
      { name: 'Alderamin', distance: '49 Lj', note: 'In einigen tausend Jahren wird er unser Polarstern' },
      { name: 'Delta Cephei', distance: 'rund 890 Lj', note: 'Pulsiert regelmäßig. Mit solchen Sternen misst man Entfernungen im Weltall' },
    ],
    myth: 'König Kepheus ist der Mann der Kassiopeia und der Vater der Andromeda.',
    find: 'Neben Kassiopeia, zwischen ihr und dem Polarstern.',
  },
  'kreuz-des-suedens': {
    latin: 'Crux', abbr: 'Cru', season: 'sueden', tagline: 'Das kleinste Sternbild',
    stars: [
      { name: 'Acrux', distance: 'rund 320 Lj', note: 'Unterer Stern des Kreuzes, im Fernrohr ein Doppelstern' },
      { name: 'Gacrux', distance: '88 Lj', note: 'Oben, ein roter Riese' },
    ],
    myth: 'Seefahrer auf der Südhalbkugel fanden damit den Weg nach Süden. Es ist auf den Flaggen von Australien, Neuseeland und Brasilien.',
    find: 'Von Mitteleuropa aus nie zu sehen. Die lange Achse zeigt ungefähr zum Südpol des Himmels.',
  },
  widder: {
    latin: 'Aries', abbr: 'Ari', season: 'herbst', tagline: 'Das erste Tierkreiszeichen',
    stars: [
      { name: 'Hamal', distance: '66 Lj', note: 'Orangefarbener Riese, der Kopf des Widders' },
    ],
    myth: 'Der Widder mit dem goldenen Fell, das die Argonauten später suchten.',
    find: 'Unterhalb der Andromeda, ein kurzer gebogener Strich.',
  },
  stier: {
    latin: 'Taurus', abbr: 'Tau', season: 'winter', tagline: 'Mit dem Siebengestirn',
    stars: [
      { name: 'Aldebaran', distance: '65 Lj', note: 'Das rote Auge des Stiers, ein Riese' },
      { name: 'Plejaden', distance: 'rund 440 Lj', note: 'Das Siebengestirn: ein Haufen junger blauer Sterne auf seinem Rücken' },
    ],
    myth: 'Zeus verwandelte sich in einen weißen Stier und trug die Prinzessin Europa übers Meer.',
    find: 'Verlängere den Orion-Gürtel nach rechts oben, dann leuchtet Aldebaran.',
  },
  zwillinge: {
    latin: 'Gemini', abbr: 'Gem', season: 'winter', tagline: 'Kastor und Pollux',
    stars: [
      { name: 'Pollux', distance: '34 Lj', note: 'Der hellere der beiden, orange. Um ihn kreist ein Planet' },
      { name: 'Kastor', distance: '51 Lj', note: 'In Wahrheit sechs Sterne, die sich umkreisen' },
    ],
    myth: 'Die Brüder Kastor und Pollux waren unzertrennlich, auch am Himmel stehen sie Kopf an Kopf.',
    find: 'Links oberhalb von Orion zwei helle Sterne nebeneinander. Mitte Dezember kommen aus ihnen die Geminiden.',
  },
  krebs: {
    latin: 'Cancer', abbr: 'Cnc', season: 'fruehling', tagline: 'Blass, mit der Krippe',
    stars: [
      { name: 'Tarf', distance: 'rund 290 Lj', note: 'Hellster Stern des Krebses, trotzdem recht schwach' },
      { name: 'Krippe (M44)', distance: 'rund 600 Lj', note: 'Ein Haufen aus Hunderten Sternen, mit bloßem Auge ein Nebelfleck' },
    ],
    myth: 'Ein Krebs zwickte Herkules beim Kampf in den Fuß und wurde zertreten. Hera setzte ihn zum Dank an den Himmel.',
    find: 'Zwischen den Zwillingen und dem Löwen. Am besten in einer dunklen Nacht.',
  },
  loewe: {
    latin: 'Leo', abbr: 'Leo', season: 'fruehling', tagline: 'Mit Regulus und Fragezeichen',
    stars: [
      { name: 'Regulus', distance: '79 Lj', note: 'Das „Königlein“, die Brust des Löwen' },
      { name: 'Denebola', distance: '36 Lj', note: 'Die Schwanzspitze' },
    ],
    myth: 'Der Nemeische Löwe, dessen Fell kein Pfeil durchdrang. Herkules besiegte ihn als erste seiner Aufgaben.',
    find: 'Unter dem Großen Wagen. Mitte November kommen aus ihm die Leoniden.',
  },
  jungfrau: {
    latin: 'Virgo', abbr: 'Vir', season: 'fruehling', tagline: 'Mit der Ähre Spica',
    stars: [
      { name: 'Spica', distance: 'rund 250 Lj', note: 'Zwei heiße blaue Sterne, die sich in vier Tagen umrunden' },
    ],
    myth: 'Oft als Erntegöttin mit einer Ähre in der Hand dargestellt. Spica heißt Ähre.',
    find: 'Folge dem Bogen der Wagendeichsel über Arktur hinaus: „weiter zur Spica“.',
  },
  waage: {
    latin: 'Libra', abbr: 'Lib', season: 'sommer', tagline: 'Früher die Scheren des Skorpions',
    stars: [
      { name: 'Zubeneschamali', distance: 'rund 185 Lj', note: 'Arabisch für „nördliche Schere“' },
      { name: 'Zubenelgenubi', distance: '75 Lj', note: '„Südliche Schere“, ein Doppelstern' },
    ],
    myth: 'Die Waage gehörte früher zum Skorpion. Daher die Namen ihrer Sterne.',
    find: 'Zwischen Spica und dem roten Antares, tief im Süden.',
  },
  skorpion: {
    latin: 'Scorpius', abbr: 'Sco', season: 'sommer', tagline: 'Mit dem roten Antares',
    stars: [
      { name: 'Antares', distance: 'rund 550 Lj', note: 'Roter Überriese. Der Name heißt „Gegenmars“, weil er so rot leuchtet' },
    ],
    myth: 'Der Skorpion, der Orion stach. Er geht auf, wenn Orion untergeht.',
    find: 'Im Juli abends tief am Südhorizont, ein rotes Licht mit einem Haken.',
  },
  schuetze: {
    latin: 'Sagittarius', abbr: 'Sgr', season: 'sommer', tagline: 'Die Teekanne',
    stars: [
      { name: 'Kaus Australis', distance: 'rund 145 Lj', note: 'Hellster Stern, unten an der Teekanne' },
      { name: 'Milchstraßen-Zentrum', distance: 'rund 26 000 Lj', note: 'Dahinter liegt die Mitte unserer Galaxie mit einem Schwarzen Loch' },
    ],
    myth: 'Ein Zentaur, halb Mensch, halb Pferd, mit gespanntem Bogen.',
    find: 'Links vom Skorpion, tief im Süden. Aus dem Ausguss scheint die Milchstraße zu dampfen.',
  },
  steinbock: {
    latin: 'Capricornus', abbr: 'Cap', season: 'herbst', tagline: 'Halb Ziege, halb Fisch',
    stars: [
      { name: 'Deneb Algedi', distance: '39 Lj', note: '„Schwanz des Böckchens“' },
    ],
    myth: 'Der Hirtengott Pan sprang auf der Flucht ins Wasser. Die untere Hälfte wurde zum Fisch.',
    find: 'Unterhalb von Atair, ein flaches Dreieck.',
  },
  wassermann: {
    latin: 'Aquarius', abbr: 'Aqr', season: 'herbst', tagline: 'Der Wasserträger',
    stars: [
      { name: 'Sadalsuud', distance: 'rund 540 Lj', note: '„Glück der Glücke“, hellster Stern des Wassermanns' },
    ],
    myth: 'Ganymed, der Mundschenk der Götter, gießt Wasser aus seinem Krug.',
    find: 'Unterhalb des Pegasus-Vierecks. Viele schwache Sterne, am besten in dunkler Nacht.',
  },
  fische: {
    latin: 'Pisces', abbr: 'Psc', season: 'herbst', tagline: 'Zwei verbundene Fische',
    stars: [
      { name: 'Alrescha', distance: 'rund 150 Lj', note: '„Das Band“, der Knoten zwischen den Fischen' },
    ],
    myth: 'Aphrodite und ihr Sohn Eros verwandelten sich in Fische und banden sich zusammen, um sich nicht zu verlieren.',
    find: 'Unter dem Pegasus-Viereck. Hier liegt heute der Frühlingspunkt, wo die Sonne im März steht.',
  },
};

export function getConstellation(id: string | undefined) {
  return constellations.find((c) => c.id === id);
}

/* ---------- Die hellsten Sterne ---------- */

export type BrightStar = {
  id: string;
  name: string;
  constellation: string;
  distance: string;
  /** Farbe nach Temperatur: bläulich = heiß, rötlich = kühl */
  color: string;
  note: string;
  /** Oberflächentemperatur, gerundet */
  temperature: string;
  /** Durchmesser im Vergleich zur Sonne */
  size: string;
  /** Wie viel Licht er abgibt, im Vergleich zur Sonne */
  luminosity: string;
  text: string[];
};

/**
 * Nach Helligkeit am Himmel, von Mitteleuropa aus sichtbar. Werte gerundet,
 * „rund“ bei großen Messunsicherheiten (vor allem Entfernung von Riesensternen).
 */
export const brightStars: BrightStar[] = [
  {
    id: 'sirius', name: 'Sirius', constellation: 'grosser-hund', distance: '8,6 Lj', color: '#CFE0FF',
    note: 'Der hellste Stern am Nachthimmel', temperature: 'rund 9 600 °C', size: '1,7 × Sonne', luminosity: 'rund 25 × Sonne',
    text: [
      'Sirius ist so hell, weil er zweierlei ist: deutlich leuchtkräftiger als die Sonne und einer unserer nächsten Nachbarn.',
      'Um ihn kreist ein Weißer Zwerg, Sirius B: der ausgebrannte Kern eines Sterns, etwa so groß wie die Erde, aber fast so schwer wie die Sonne.',
    ],
  },
  {
    id: 'arktur', name: 'Arktur', constellation: 'baerenhueter', distance: '37 Lj', color: '#FFC58A',
    note: 'Orangefarbener Riese', temperature: 'rund 4 000 °C', size: 'rund 25 × Sonne', luminosity: 'rund 170 × Sonne',
    text: [
      'Arktur ist ein alter Stern, der sich zum Riesen aufgebläht hat. So wird es der Sonne in einigen Milliarden Jahren auch ergehen.',
      'Er ist der hellste Stern der Nordhalbkugel des Himmels. Man findet ihn, wenn man dem Bogen der Wagendeichsel folgt.',
    ],
  },
  {
    id: 'wega', name: 'Wega', constellation: 'leier', distance: '25 Lj', color: '#DDE8FF',
    note: 'Ecke des Sommerdreiecks', temperature: 'rund 9 300 °C', size: 'rund 2,5 × Sonne', luminosity: 'rund 40 × Sonne',
    text: [
      'Wega dreht sich so schnell, dass sie am Äquator deutlich dicker ist als an den Polen.',
      'Durch das langsame Taumeln der Erdachse war Wega vor rund 12 000 Jahren der Polarstern und wird es in etwa 12 000 Jahren wieder sein.',
    ],
  },
  {
    id: 'kapella', name: 'Kapella', constellation: 'fuhrmann', distance: '43 Lj', color: '#FFE6A8',
    note: 'Zwei gelbe Riesen', temperature: 'rund 4 700 bis 5 500 °C', size: 'rund 12 und 9 × Sonne', luminosity: 'rund 80 und 70 × Sonne',
    text: [
      'Was wie ein Stern aussieht, sind zwei gelbe Riesen, die sich in gut 100 Tagen umkreisen. Sie stehen so eng, dass man sie nur mit Spezialinstrumenten trennen kann.',
    ],
  },
  {
    id: 'rigel', name: 'Rigel', constellation: 'orion', distance: 'rund 860 Lj', color: '#BCD2FF',
    note: 'Blauweißer Überriese', temperature: 'rund 12 000 °C', size: 'rund 80 × Sonne', luminosity: 'zehntausende Male heller',
    text: [
      'Rigel ist einer der leuchtkräftigsten Sterne, die man mit bloßem Auge sieht. Stünde er so nah wie Sirius, würde er nachts Schatten werfen.',
      'Solche schweren Sterne leben nur wenige Millionen Jahre und enden in einer Supernova.',
    ],
  },
  {
    id: 'prokyon', name: 'Prokyon', constellation: 'kleiner-hund', distance: '11,5 Lj', color: '#FFF4E0',
    note: 'Naher Nachbar', temperature: 'rund 6 300 °C', size: 'rund 2 × Sonne', luminosity: 'rund 7 × Sonne',
    text: [
      'Prokyon heißt „vor dem Hund“: Er geht kurz vor Sirius auf. Auch er hat einen Weißen Zwerg als Begleiter.',
    ],
  },
  {
    id: 'beteigeuze', name: 'Beteigeuze', constellation: 'orion', distance: 'rund 550 Lj', color: '#FF9A6A',
    note: 'Roter Überriese', temperature: 'rund 3 300 °C', size: 'rund 750 × Sonne', luminosity: 'zehntausende Male heller',
    text: [
      'An Stelle der Sonne würde Beteigeuze bis über die Marsbahn hinausreichen.',
      'Ende 2019 wurde er plötzlich deutlich dunkler. Heute weiß man: Er hatte eine Staubwolke ausgestoßen. Irgendwann wird er als Supernova explodieren, vielleicht erst in 100 000 Jahren.',
    ],
  },
  {
    id: 'atair', name: 'Atair', constellation: 'adler', distance: '17 Lj', color: '#F2F4FF',
    note: 'Dreht sich sehr schnell', temperature: 'rund 7 500 °C', size: 'rund 2 × Sonne', luminosity: 'rund 10 × Sonne',
    text: [
      'Atair dreht sich in knapp neun Stunden einmal um sich selbst. Die Sonne braucht dafür fast einen Monat. Dadurch ist er sichtbar abgeplattet.',
    ],
  },
  {
    id: 'aldebaran', name: 'Aldebaran', constellation: 'stier', distance: '65 Lj', color: '#FFB27A',
    note: 'Das Auge des Stiers', temperature: 'rund 3 600 °C', size: 'rund 44 × Sonne', luminosity: 'rund 400 × Sonne',
    text: [
      'Aldebaran steht vor dem Sternhaufen der Hyaden, gehört aber nicht dazu. Er ist nur halb so weit weg.',
      'Die Raumsonde Pioneer 10 fliegt ungefähr in seine Richtung. Sie bräuchte rund zwei Millionen Jahre bis dorthin.',
    ],
  },
  {
    id: 'antares', name: 'Antares', constellation: 'skorpion', distance: 'rund 550 Lj', color: '#FF8A5E',
    note: 'Roter Überriese', temperature: 'rund 3 300 °C', size: 'rund 700 × Sonne', luminosity: 'zehntausende Male heller',
    text: [
      'Der Name heißt „Gegenmars“: Er ist so rot, dass man ihn mit dem Planeten Mars verwechseln kann, der manchmal in seiner Nähe vorbeizieht.',
    ],
  },
  {
    id: 'spica', name: 'Spica', constellation: 'jungfrau', distance: 'rund 250 Lj', color: '#C4D8FF',
    note: 'Zwei heiße Sterne', temperature: 'rund 22 000 °C', size: 'rund 7 × Sonne', luminosity: 'tausende Male heller',
    text: [
      'Spica sind zwei heiße blaue Sterne, die sich in nur vier Tagen umkreisen. Sie stehen so eng, dass sie sich gegenseitig zu Eiern verformen.',
    ],
  },
  {
    id: 'pollux', name: 'Pollux', constellation: 'zwillinge', distance: '34 Lj', color: '#FFD49A',
    note: 'Hat einen Planeten', temperature: 'rund 4 300 °C', size: 'rund 9 × Sonne', luminosity: 'rund 30 × Sonne',
    text: [
      'Um Pollux kreist ein Gasplanet, größer als Jupiter. Er wurde 2006 entdeckt und trägt den Namen Thestias.',
    ],
  },
  {
    id: 'deneb', name: 'Deneb', constellation: 'schwan', distance: 'rund 2 600 Lj', color: '#E8EEFF',
    note: 'Extrem leuchtkräftig', temperature: 'rund 8 300 °C', size: 'rund 200 × Sonne', luminosity: 'zehntausende Male heller',
    text: [
      'Deneb ist mit Abstand der fernste Stern dieser Liste und trotzdem gut zu sehen. Er gehört zu den leuchtkräftigsten Sternen, die wir kennen.',
      'Wie weit er genau weg ist, weiß man nicht sicher. Die Schätzungen gehen weit auseinander.',
    ],
  },
  {
    id: 'regulus', name: 'Regulus', constellation: 'loewe', distance: '79 Lj', color: '#D6E4FF',
    note: 'Das Königlein', temperature: 'rund 12 000 °C', size: 'rund 4 × Sonne', luminosity: 'rund 300 × Sonne',
    text: [
      'Regulus dreht sich in rund 16 Stunden einmal um sich selbst, fast so schnell, dass er auseinanderfliegen würde.',
      'Er steht fast genau auf der Sonnenbahn. Deshalb zieht der Mond regelmäßig vor ihm vorbei.',
    ],
  },
];

export function getBrightStar(id: string | undefined) {
  return brightStars.find((s) => s.id === id);
}

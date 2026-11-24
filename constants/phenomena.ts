/**
 * Himmelserscheinungen fürs Lexikon. Werte gerundet; Raten von Meteorströmen
 * gelten für ideal dunklen Himmel, in der Stadt sieht man deutlich weniger.
 */
import type { IconSymbolName } from '@/components/ui/IconSymbol';

export type Phenomenon = {
  id: string;
  name: string;
  tagline: string;
  icon: IconSymbolName;
  facts: { label: string; value: string }[];
  text: string[];
  /** Wann und wie man es selbst sieht */
  see: string;
  /** Im Sternenkasten einschalten oder zeigen */
  box?: { label: string; enable?: string; show?: string };
};

export const phenomena: Phenomenon[] = [
  {
    id: 'milchstrasse',
    name: 'Milchstraße',
    tagline: 'Unsere Galaxie von innen gesehen',
    icon: 'sparkles',
    facts: [
      { label: 'Durchmesser', value: 'rund 100 000 Lj' },
      { label: 'Sterne', value: '100 bis 400 Milliarden' },
      { label: 'Abstand der Sonne zum Zentrum', value: 'rund 26 000 Lj' },
      { label: 'Eine Runde der Sonne ums Zentrum', value: 'rund 230 Millionen Jahre' },
    ],
    text: [
      'Die Milchstraße ist eine flache Scheibe aus Sternen, Gas und Staub. Wir sitzen mittendrin, deshalb sehen wir sie als helles Band einmal rund um den Himmel.',
      'Die dunklen Flecken im Band sind keine Lücken, sondern Staubwolken, die das Licht dahinter verschlucken. In ihrer Mitte, hinter dem Sternbild Schütze, sitzt ein Schwarzes Loch mit rund vier Millionen Sonnenmassen.',
    ],
    see: 'Nur fern von Stadtlichtern. Am hellsten in Sommernächten, wenn man Richtung Süden zum Schützen schaut.',
    box: { label: 'Im Sternenkasten einschalten', enable: 'milky' },
  },
  {
    id: 'polarlicht',
    name: 'Polarlicht',
    tagline: 'Wenn der Sonnenwind die Luft leuchten lässt',
    icon: 'water.waves',
    facts: [
      { label: 'Höhe', value: 'rund 100 bis 400 km' },
      { label: 'Grün', value: 'Sauerstoff, rund 100 bis 250 km hoch' },
      { label: 'Rot', value: 'Sauerstoff, weiter oben' },
      { label: 'Blau und Violett', value: 'Stickstoff' },
    ],
    text: [
      'Die Sonne bläst ständig geladene Teilchen ins All, den Sonnenwind. Das Magnetfeld der Erde lenkt sie zu den Polen. Dort stoßen sie mit der Luft zusammen und bringen sie zum Leuchten, wie in einer Leuchtröhre.',
      'Im Norden heißt es Nordlicht, im Süden Südlicht. Bei sehr starken Sonnenstürmen ist es auch weiter südlich zu sehen, im Mai 2024 zum Beispiel in ganz Deutschland.',
    ],
    see: 'In Nordnorwegen, Finnland, Island oder Kanada in dunklen Winternächten. In Mitteleuropa nur bei starken Sonnenstürmen, dann tief im Norden.',
    box: { label: 'Nordlicht im Kasten einschalten', enable: 'aurora' },
  },
  {
    id: 'sternschnuppen',
    name: 'Sternschnuppen',
    tagline: 'Staubkörnchen, die verglühen',
    icon: 'moon.stars.fill',
    facts: [
      { label: 'Größe', value: 'meist kleiner als ein Sandkorn' },
      { label: 'Tempo', value: '11 bis 72 km pro Sekunde' },
      { label: 'Höhe beim Verglühen', value: 'rund 80 bis 120 km' },
    ],
    text: [
      'Eine Sternschnuppe ist kein Stern, sondern ein winziges Stück Staub aus dem All. Es rast so schnell in die Lufthülle, dass die Luft davor glühend heiß wird und leuchtet.',
      'Die Farbe verrät, woraus es besteht: grünlich leuchtet zum Beispiel Magnesium, orange Natrium. Wenn die Erde durch die Staubspur eines Kometen fliegt, gibt es einen ganzen Strom. Alle Schnuppen scheinen dann aus einem Punkt zu kommen, dem Radianten.',
    ],
    see: 'Jede klare Nacht ein paar pro Stunde. Am meisten bei den großen Meteorströmen, am besten nach Mitternacht.',
  },
  {
    id: 'perseiden',
    name: 'Perseiden',
    tagline: 'Der Sternschnuppen-Sommer',
    icon: 'moon.stars.fill',
    facts: [
      { label: 'Höhepunkt', value: 'um den 12. August' },
      { label: 'Pro Stunde', value: 'bis rund 100' },
      { label: 'Herkunft', value: 'Komet 109P/Swift-Tuttle' },
      { label: 'Radiant', value: 'im Perseus' },
    ],
    text: [
      'Die Perseiden sind der bekannteste Meteorstrom, auch weil die Augustnächte warm sind. Ihr Staub stammt vom Kometen Swift-Tuttle, der alle 133 Jahre an der Sonne vorbeikommt.',
    ],
    see: 'Mitte August nach Mitternacht, Blick nach Nordosten. Man braucht kein Fernrohr, nur Geduld und Dunkelheit.',
    box: { label: 'Im Sternenkasten einschalten', enable: 'perseiden' },
  },
  {
    id: 'leoniden',
    name: 'Leoniden',
    tagline: 'Selten viele, aber manchmal ein Sturm',
    icon: 'moon.stars.fill',
    facts: [
      { label: 'Höhepunkt', value: 'um den 17. November' },
      { label: 'Pro Stunde', value: 'meist rund 10 bis 15' },
      { label: 'Herkunft', value: 'Komet 55P/Tempel-Tuttle' },
      { label: 'Radiant', value: 'im Löwen' },
    ],
    text: [
      'Die Leoniden sind die schnellsten Sternschnuppen, mit rund 70 km pro Sekunde. Etwa alle 33 Jahre, wenn ihr Komet frischen Staub hinterlassen hat, kann es einen Meteorsturm geben, mit tausenden Schnuppen pro Stunde, zuletzt um 1999 bis 2001.',
    ],
    see: 'Mitte November in den frühen Morgenstunden, wenn der Löwe im Osten aufgegangen ist.',
    box: { label: 'Im Sternenkasten einschalten', enable: 'leoniden' },
  },
  {
    id: 'geminiden',
    name: 'Geminiden',
    tagline: 'Der reichste Strom des Jahres',
    icon: 'moon.stars.fill',
    facts: [
      { label: 'Höhepunkt', value: 'um den 14. Dezember' },
      { label: 'Pro Stunde', value: 'bis rund 150' },
      { label: 'Herkunft', value: 'Asteroid (3200) Phaethon' },
      { label: 'Radiant', value: 'in den Zwillingen' },
    ],
    text: [
      'Die Geminiden sind eine Ausnahme: Ihr Staub kommt nicht von einem Kometen, sondern vom Gesteinsbrocken Phaethon. Die Schnuppen sind eher langsam und oft hell.',
    ],
    see: 'Mitte Dezember schon ab dem späten Abend, weil die Zwillinge früh aufgehen. Warm anziehen.',
    box: { label: 'Im Sternenkasten einschalten', enable: 'geminiden' },
  },
  {
    id: 'lyriden',
    name: 'Lyriden',
    tagline: 'Einer der ältesten bekannten Ströme',
    icon: 'moon.stars.fill',
    facts: [
      { label: 'Höhepunkt', value: 'um den 22. April' },
      { label: 'Pro Stunde', value: 'rund 15 bis 20' },
      { label: 'Herkunft', value: 'Komet C/1861 G1 (Thatcher)' },
      { label: 'Radiant', value: 'in der Leier' },
    ],
    text: [
      'Schon vor über 2 600 Jahren schrieben Beobachter in China auf, wie in einer Aprilnacht Sterne wie Regen fielen. Ihr Komet kommt nur alle rund 415 Jahre wieder.',
    ],
    see: 'Ende April nach Mitternacht, wenn die Leier mit der hellen Wega hoch im Osten steht.',
    box: { label: 'Im Sternenkasten einschalten', enable: 'lyriden' },
  },
  {
    id: 'ekliptik',
    name: 'Ekliptik und Tierkreis',
    tagline: 'Die Straße der Sonne und Planeten',
    icon: 'circle.dashed',
    facts: [
      { label: 'Neigung der Erdachse dazu', value: '23,4 Grad' },
      { label: 'Sternbilder auf der Ekliptik', value: '13, mit dem Schlangenträger' },
    ],
    text: [
      'Von der Erde aus wandert die Sonne im Laufe eines Jahres einmal vor den Sternen herum. Ihre Bahn heißt Ekliptik, die Sternbilder dahinter sind der Tierkreis.',
      'Mond und Planeten bleiben immer in der Nähe dieser Linie, weil das Sonnensystem ziemlich flach ist. Und weil die Erdachse dazu schräg steht, gibt es Jahreszeiten.',
    ],
    see: 'Man sieht sie nicht als Linie, aber man kann ihr folgen: Wo Mond und helle Planeten stehen, verläuft sie ungefähr.',
    box: { label: 'Tierkreis im Kasten ansehen', show: 'loewe' },
  },
  {
    id: 'himmelsdrehung',
    name: 'Polarstern und Himmelsdrehung',
    tagline: 'Warum sich alles um einen Punkt dreht',
    icon: 'star.fill',
    facts: [
      { label: 'Ein Sterntag', value: '23 h 56 min' },
      { label: 'Polarstern vom Himmelspol', value: 'weniger als 1 Grad' },
      { label: 'Taumeln der Erdachse', value: 'eine Runde in rund 26 000 Jahren' },
    ],
    text: [
      'Die Erde dreht sich einmal am Tag. Für uns sieht es so aus, als drehe sich der ganze Himmel, und zwar um eine Achse, die fast genau auf den Polarstern zeigt. Deshalb steht er still, während alle anderen Sterne Kreise um ihn ziehen.',
      'Die Erdachse taumelt langsam wie ein Kreisel. In einigen tausend Jahren wird ein anderer Stern Polarstern sein, in rund 12 000 Jahren die Wega.',
    ],
    see: 'Folge der Hinterachse des Großen Wagens nach oben. Eine lange Belichtung mit der Kamera zeigt die Kreisbahnen der Sterne.',
    box: { label: 'Planetarium im Kasten ansehen', show: 'kleiner-wagen' },
  },
  {
    id: 'geozentrisch',
    name: 'Das geozentrische Weltbild',
    tagline: 'Als die Erde noch in der Mitte stand',
    icon: 'globe.europe.africa.fill',
    facts: [
      { label: 'Ptolemäus beschreibt es', value: 'um 150 n. Chr.' },
      { label: 'Kopernikus: Sonne in der Mitte', value: '1543' },
      { label: 'Galilei sieht Jupitermonde', value: '1610' },
    ],
    text: [
      'Lange glaubte man, die Erde stehe in der Mitte und alles drehe sich um sie: Mond, Sonne, Planeten und ganz außen die Kugel der Fixsterne. Von der Erde aus sieht es genau so aus.',
      'Kopernikus zeigte, dass sich vieles einfacher erklärt, wenn die Sonne in der Mitte steht. Galilei sah durchs Fernrohr Monde, die um Jupiter kreisen, also nicht alles um die Erde. Der Sternenkasten zeigt die Sicht von der Erde aus, wie man den Himmel erlebt.',
    ],
    see: 'Jede Nacht: Die Sterne gehen im Osten auf und im Westen unter, als drehe sich der Himmel um uns.',
    box: { label: 'Im Sternenkasten erleben' },
  },
];

export function getPhenomenon(id: string | undefined) {
  return phenomena.find((p) => p.id === id);
}

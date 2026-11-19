import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

/**
 * Design-Tokens der Planets-App. Jede Farbe, Schrift, jeder Abstand und Radius
 * in Komponenten kommt von hier. Regeln und Begründungen stehen in DESIGN.md.
 */

export const color = {
  /** Tiefster Grund: Weltraum hinter der 3D-Szene und Seitenhintergrund */
  space: '#05060A',
  /** Fläche für Karten, Sheets, Tab-Leiste */
  surface: '#10121A',
  /** Erhöhte Fläche: gedrückte Zeilen, Kacheln auf Karten, Segment-Hintergrund */
  surfaceRaised: '#1A1D27',
  /** Haarlinien und Trenner */
  border: 'rgba(255, 255, 255, 0.08)',
  /** Hover auf Flächen */
  hoverFill: 'rgba(255, 255, 255, 0.06)',
  /** Gewähltes Segment in neutralen Steuerelementen */
  selectedFill: 'rgba(255, 255, 255, 0.16)',

  text: '#F3F1EA',
  /** Sekundärtext, 8.6:1 auf space, 7.4:1 auf surface */
  textMuted: '#A9ADB8',
  /** Tertiärtext (Labels), 5.2:1 auf surface */
  textSubtle: '#858A97',

  /** Akzent: Sonnenlicht. Für Auswahl, Primary-Button, aktive Bahn */
  accent: '#F5B544',
  accentPressed: '#E3A232',
  /** Text auf Akzentfläche, 11:1 */
  onAccent: '#1C1406',
  /** Akzent als Linie in der 3D-Szene */
  accentLine: '#F5B544',

} as const;

export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/**
 * Radien folgen der Verschachtelungsregel: außen = innen + Abstand.
 * Sheet (padding md=16) mit Buttons (control=12) innen → sheet = 28.
 */
export const radius = {
  /** Buttons, Segmente, Eingaben */
  control: 12,
  /** Fakten-Kacheln, Listenkarten */
  tile: 16,
  /** Schwebende Sheets mit Controls darin (12 + 16) */
  sheet: 28,
  pill: 999,
} as const;

const mono = Platform.select({ web: 'SpaceMono, ui-monospace, monospace', default: 'SpaceMono' });

/** Typo-Skala. Text in System-Schrift, Messwerte in SpaceMono (nur für Daten). */
export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.6 },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  data: { fontSize: 17, lineHeight: 24, fontFamily: mono, fontVariant: ['tabular-nums'] },
  /** Handschrift, nur für Bastel-Elemente im Schaukasten */
  hand: { fontSize: 15, lineHeight: 17, fontFamily: 'Caveat_700Bold' },
  dataSmall: { fontSize: 13, lineHeight: 18, fontFamily: mono, fontVariant: ['tabular-nums'] },
} as const;

export const motion = {
  /** Rein und raus */
  easeOut: Easing.bezierFn(0.23, 1, 0.32, 1),
  press: 140,
  sheetIn: 260,
  sheetOut: 160,
  /** Kameraflug zu einem Planeten in Sekunden */
  cameraFly: 1.1,
  pressScale: 0.96,
} as const;

/** Mindestgröße für Touch-Ziele */
export const hitTarget = 44;

/** Weicher, mehrlagiger Schatten für schwebende Flächen über der Szene */
export const elevation = {
  floating: Platform.select({
    web: { boxShadow: '0 1px 2px rgba(0,0,0,0.4), 0 12px 32px rgba(0,0,0,0.45)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.45,
      shadowRadius: 24,
      elevation: 12,
    },
  }),
} as const;

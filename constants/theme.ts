import { Platform } from 'react-native';
import { Easing } from 'react-native-reanimated';

/**
 * Design-Tokens der Planets-App. Jede Farbe, Schrift, jeder Abstand und Radius
 * in Komponenten kommt von hier. Regeln und Begründungen stehen in DESIGN.md.
 */

export const color = {
  /** Tiefster Grund: Weltraum hinter der 3D-Szene und Seitenhintergrund */
  space: '#0B1026',
  /** Fläche für Karten, Sheets, Tab-Leiste */
  surface: '#141B3A',
  /** Erhöhte Fläche: gedrückte Zeilen, Kacheln auf Karten, Segment-Hintergrund */
  surfaceRaised: '#1D2550',
  /** Haarlinien und Trenner */
  border: 'rgba(238, 240, 250, 0.09)',
  /** Hover auf Flächen */
  hoverFill: 'rgba(255, 255, 255, 0.06)',
  /** Gewähltes Segment in neutralen Steuerelementen */
  selectedFill: 'rgba(255, 255, 255, 0.16)',

  text: '#EEF0FA',
  /** Sekundärtext, 7.6:1 auf space, 6.6:1 auf surface */
  textMuted: '#A3ACD0',
  /** Tertiärtext (Labels), 4.9:1 auf surface */
  textSubtle: '#8A93BC',

  /** Akzent: Weiß. Für Auswahl, Primary-Button, aktive Bahn */
  accent: '#FFFFFF',
  accentPressed: '#D9DDEE',
  /** Text auf Akzentfläche, 17:1 */
  onAccent: '#0B1026',
  /** Akzent als Linie in der 3D-Szene */
  accentLine: '#FFFFFF',

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

/**
 * Typo-Skala. Unbounded für Überschriften und Messwerte, Inter für Text.
 * Eigene Schriften brauchen je Gewicht eine eigene Familie (kein fontWeight).
 */
export const type = {
  display: { fontSize: 34, lineHeight: 42, fontFamily: 'Unbounded_700Bold', letterSpacing: -0.8 },
  title: { fontSize: 22, lineHeight: 30, fontFamily: 'Unbounded_700Bold', letterSpacing: -0.4 },
  heading: { fontSize: 18, lineHeight: 24, fontFamily: 'Inter_600SemiBold' },
  body: { fontSize: 16, lineHeight: 24, fontFamily: 'Inter_400Regular' },
  bodySmall: { fontSize: 14, lineHeight: 20, fontFamily: 'Inter_400Regular' },
  label: { fontSize: 13, lineHeight: 18, fontFamily: 'Inter_500Medium' },
  data: { fontSize: 18, lineHeight: 26, fontFamily: 'Unbounded_500Medium', fontVariant: ['tabular-nums'] },
  /** Handschrift, nur für Bastel-Elemente im Schaukasten */
  hand: { fontSize: 15, lineHeight: 17, fontFamily: 'Caveat_700Bold' },
  dataSmall: { fontSize: 13, lineHeight: 18, fontFamily: 'Unbounded_500Medium', fontVariant: ['tabular-nums'] },
  /** Text auf Buttons und Chips */
  button: { fontSize: 15, lineHeight: 20, fontFamily: 'Inter_600SemiBold' },
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

# Design-System: Planets

Die App ist ein Fenster in den Weltraum. Die 3D-Szene führt, die Oberfläche tritt zurück: dunkle, ruhige Flächen, ein einziger Akzent in Weiß und kräftige Überschriften in Unbounded.

Alle Werte liegen in [`constants/theme.ts`](constants/theme.ts). In Komponenten stehen keine festen Farben, Größen oder Schriften.

## Grundsätze

1. **Die Szene führt.** UI über der 3D-Ansicht schwebt am Rand und lässt die Mitte frei. Wenn ein Planet gewählt ist, wird der Bildausschnitt so verschoben, dass er zwischen Titelzeile und Infokarte steht.
2. **Ein Akzent, eine Bedeutung.** Weiß (`accent`) heißt „ausgewählt“ oder „Hauptaktion“, sonst nichts: gewählter Planeten-Chip, aktive Bahn, Primary-Button, aktiver Tab.
3. **Immer dunkel.** Man schaut in den Weltraum. Helle Flächen neben einer schwarzen Szene würden blenden, deshalb gibt es kein Light-Theme (`userInterfaceStyle: dark`).
4. **Ehrliche Daten.** Fakten stammen von der NASA. Wo die Darstellung nicht maßstabsgetreu ist (Größen, Abstände), steht das in der App.

## Tokens

### Farbe

| Token | Wert | Verwendung |
| --- | --- | --- |
| `space` | `#0B1026` | Hintergrund der Szene und Seiten |
| `surface` | `#141B3A` | Karten, Sheets, Tab-Leiste, Chips |
| `surfaceRaised` | `#1D2550` | Hover/gedrückt auf Flächen, Secondary-Button |
| `border` | `rgba(255,255,255,.08)` | Haarlinien |
| `hoverFill` / `selectedFill` | weiß 6 % / 16 % | Hover und gewähltes Segment in neutralen Controls |
| `text` | `#EEF0FA` | Haupttext |
| `textMuted` | `#A3ACD0` | Sekundärtext (6,6:1 auf `surface`) |
| `textSubtle` | `#8A93BC` | Labels, Quellen (4,9:1 auf `surface`) |
| `accent` / `accentPressed` | `#FFFFFF` / `#D9DDEE` | Auswahl, Primary |
| `onAccent` | `#0B1026` | Text auf Akzent (17:1) |

Planetenfarben sind Daten und liegen in [`constants/planets.ts`](constants/planets.ts), nicht im Theme.

### Typografie

Unbounded für Überschriften und Messwerte, Inter für Text, Caveat (Handschrift) nur im Schaukasten. Eigene Schriften brauchen je Gewicht eine eigene Familie, deshalb kein `fontWeight`. Tabellenziffern für alle Zahlen.

| Token | Größe / Zeile | Gewicht | Wofür |
| --- | --- | --- | --- |
| `display` | 34 / 40 | 700 | Seitentitel, Planetenname auf der Detailseite |
| `title` | 24 / 30 | 700 | Screen-Titel, Name in der Infokarte |
| `heading` | 18 / 24 | 600 | Listenzeilen, Gruppen, Leitsatz |
| `body` | 16 / 24 | 400 | Fließtext, max. 640 px breit |
| `bodySmall` | 14 / 20 | 400 | Beschreibung in Zeilen |
| `label` | 13 / 18 | 500 | Fakten-Labels, Chips, Segmente |
| `data` / `dataSmall` | 18 / 13 | Unbounded 500 | Messwerte in Kacheln / Infokarte |
| `button` | 15 / 20 | Inter 600 | Buttons |
| `hand` | 15 / 17 | Caveat 700 | Namensschilder im Schaukasten |

### Abstände

`xxs 4 · xs 8 · sm 12 · md 16 · lg 20 · xl 24 · xxl 32 · xxxl 48`. Seitenrand immer `md`. Abstand über Abschnitten (`xxl`) größer als darunter (`sm`).

### Radien

Verschachtelte Radien: außen = innen + Abstand.

| Token | Wert | Wofür |
| --- | --- | --- |
| `control` | 12 | Buttons, Segment-Leiste, Icon-Buttons |
| `control − xxs` | 8 | Segment in der Leiste (12 − 4 Innenabstand) |
| `tile` | 16 | Listenzeilen, Fakten-Kacheln |
| `sheet` | 28 | Infokarte (12 Button + 16 Innenabstand) |
| `pill` | 999 | Planeten-Chips |

### Bewegung

| Token | Wert | Wofür |
| --- | --- | --- |
| `easeOut` | `cubic-bezier(.23,1,.32,1)` | Rein/raus, Druck |
| `press` | 140 ms, Skalierung 0,96 | Buttons, Chips |
| `sheetIn` / `sheetOut` | 260 / 160 ms | Infokarte |
| `cameraFly` | 1,1 s, ease-in-out | Kameraflug zum Planeten |

Reduzierte Bewegung (System-Einstellung): Die Kamera springt, statt zu fliegen. Listen bewegen sich beim Scrollen nicht.

### Fläche und Tiefe

Schatten nur für schwebende Elemente über der Szene (`elevation.floating`, zweilagig, weich). Rahmen nur als Haarlinie zur Abgrenzung von Flächen und für den Fokus.

## Komponenten

Alle in [`components/ui/kit.tsx`](components/ui/kit.tsx).

| Komponente | Varianten | Zustände | Hinweise |
| --- | --- | --- | --- |
| `PressableScale` | `static` (ohne Skalierung) | gedrückt, Hover, Fokus | Basis für alles Antippbare. Fokusring nur bei Tastatur |
| `Button` | `primary`, `secondary` | Standard, Hover, gedrückt, Fokus, deaktiviert | Mind. 44 px hoch. Beschriftung = Verb + Objekt oder Ziel |
| `IconButton` | `floating`, `plain` | Hover, gedrückt, Fokus | 44 × 44 px, `label` ist Pflicht (wird vorgelesen) |
| `SegmentedControl` | – | gewählt, Hover, Fokus | `radiogroup`, 44 px Gesamthöhe |
| `PlanetChip` | – | gewählt (Akzent), Hover, gedrückt | 40 px + 4 px Hit-Slop |
| `PlanetSwatch` | mit Bändern, mit Ring | – | Flache 2D-Vorschau für kleine Punkte und den Größenvergleich |
| `Fact` | `inline`, `tile` | – | Label `label`/`textSubtle`, Wert in Mono |
| `AppText` | alle Typo-Tokens, `tone` | – | Einziger Weg, Text zu setzen |

Die 3D-Bausteine liegen in [`components/solar/`](components/solar): `SolarSystem` (Szene, Kamera, Gesten), `PlanetViewer` (Einzelplanet), `bodies.tsx` (Planet, Sonne, Sterne, Bahnen) und `shaders.ts` (Oberflächen ohne Texturen).

## Muster

- **Auswahl im System:** antippen in der Szene oder Chip → Kamera fliegt hin und folgt, Bahn leuchtet, Infokarte erscheint. Erneut tippen auf den Chip, das X oder auf leeren Raum hebt die Auswahl auf.
- **Navigation:** Tabs „System“ und „Planeten“. Detailseite liegt darüber im Stack, mit Zurück-Button und Vor/Zurück zum Nachbarplaneten.
- **Laden:** Solange die 3D-Szene kompiliert, steht „Sonnensystem wird geladen“ in der Mitte. Der Text blendet aus, sobald die ersten Frames da sind.

## Leistung (3D)

- **Oberflächen werden einmal vorberechnet:** Das Rauschen läuft im ersten Frame einmal in eine Textur, danach liest der Shader pro Bild nur noch Textur und Licht. Neue Oberflächen gehören in `bakeShader`, nicht in den Planeten-Shader.
- **Nativ 30 fps:** `lib/r3f.native.tsx` zeichnet im Takt statt mit jeder Bildwiederholung. Sonst stellt expo-gl mehr Bilder in die Warteschlange, als die GPU schafft, und das Bild friert ein.
- **Unsichtbare Tabs pausieren** (`frameloop: 'never'`), statt neu aufzubauen. 3D-Ansichten in neuen Screens starten erst nach dem Übergang.
- **Listen zeigen Stillbilder** aus `assets/planets/` (einmal aus der Szene gerendert, transparent, 192 px), keine GL-Ansichten.
- **Kamera kreist langsam**, wenn 4 s niemand eingreift (bei „Bewegung reduzieren“ aus).

## Nicht verwenden

Violett oder Lila-Blau-Verläufe, Verlaufstext, Emojis als Icons, Cards in Cards, farbige Seitenränder auf Karten, Großbuchstaben-Labels über Überschriften, Monospace für Fließtext.

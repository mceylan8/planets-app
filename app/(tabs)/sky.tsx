import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';

import {
  Pick,
  SkyController,
  SkyStyle,
  StarBox,
  createSkyController,
} from '@/components/sky/StarBox';
import { useTabBarOffset } from '@/components/ui/AppTabBar';
import { IconSymbolName } from '@/components/ui/IconSymbol';
import { MenuNote, MenuSection, SceneHeader, SceneMenu } from '@/components/ui/SceneChrome';
import { AppText, Button, IconButton, SegmentedControl, ToggleRow } from '@/components/ui/kit';
import { details, getConstellation, seasonLabel } from '@/constants/constellations';
import { getPlanet } from '@/constants/planets';
import { color, elevation, radius, space } from '@/constants/theme';
import { readText, writeText } from '@/lib/storage';

type Show = SkyController['show'];
type Motion = 'still' | 'planetarium' | 'fly';
type Settings = {
  style: SkyStyle;
  light: boolean;
  aurora: boolean;
  motion: Motion;
  /** Welche Bewegung der Play-Knopf startet */
  lastMotion: Exclude<Motion, 'still'>;
  show: Show;
};

const KEY = 'sternenkasten-v2';
const DEFAULTS: Settings = {
  style: 'dome',
  light: true,
  aurora: false,
  motion: 'still',
  lastMotion: 'planetarium',
  show: {
    milky: true,
    planets: true,
    walls: true,
    perseiden: false,
    leoniden: false,
    geminiden: false,
    lyriden: false,
  },
};

const motionOptions: { value: Motion; label: string; a11y: string }[] = [
  { value: 'still', label: 'Standbild', a11y: 'Alles steht still' },
  { value: 'planetarium', label: 'Planetarium', a11y: 'Sterne gleiten über die Kartonwände rund um die Erde' },
  { value: 'fly', label: 'Himmel öffnen', a11y: 'Sterne lösen sich von den Wänden und fliegen an den Himmel' },
];
const motionHint: Record<Motion, string> = {
  still: 'Ein Moment, eingefroren.',
  planetarium: 'Die Sterne bleiben auf dem Karton und gleiten um die Erde, über Ecken und Kanten hinweg.',
  fly: 'Der Karton öffnet sich, die Sterne fliegen an eine große Himmelskugel. Kuppel und Tierkreis machen solange Pause.',
};

const styleOptions: { value: SkyStyle; label: string; a11y: string }[] = [
  { value: 'dome', label: 'Kuppel', a11y: 'Sternbilder auf einer Glaskuppel' },
  { value: 'ring', label: 'Tierkreis', a11y: 'Die zwölf Tierkreis-Sternbilder auf einem Ring' },
  { value: 'earth', label: 'Nur Erde', a11y: 'Nur die Erde, Sternbilder an den Wänden' },
];

type Row = { key: keyof Show | 'aurora'; icon: IconSymbolName; label: string; hint: string };
const sections: { title: string; rows: Row[] }[] = [
  {
    title: 'Am Himmel',
    rows: [
      { key: 'walls', icon: 'star.fill', label: 'Sternbilder an den Wänden', hint: '32 Sternbilder rundherum' },
      { key: 'milky', icon: 'sparkles', label: 'Milchstraße', hint: 'Nebelband über die Rückwand' },
      { key: 'planets', icon: 'globe.europe.africa.fill', label: 'Planeten', hint: 'Die sieben Nachbarn der Erde' },
      { key: 'aurora', icon: 'water.waves', label: 'Nordlicht', hint: 'Über dem Nordpol der Erde' },
    ],
  },
  {
    title: 'Sternschnuppen',
    rows: [
      { key: 'perseiden', icon: 'moon.stars.fill', label: 'Perseiden', hint: 'August, aus dem Perseus' },
      { key: 'leoniden', icon: 'moon.stars.fill', label: 'Leoniden', hint: 'Mitte November, aus dem Löwen' },
      { key: 'geminiden', icon: 'moon.stars.fill', label: 'Geminiden', hint: 'Mitte Dezember, aus den Zwillingen' },
      { key: 'lyriden', icon: 'moon.stars.fill', label: 'Lyriden', hint: 'April, aus der Leier' },
    ],
  },
];

function parse(text: string | null): Settings {
  if (!text) return DEFAULTS;
  try {
    const raw = JSON.parse(text) as Partial<Settings>;
    const show = { ...DEFAULTS.show };
    for (const k of Object.keys(show) as (keyof Show)[]) {
      if (typeof raw.show?.[k] === 'boolean') show[k] = raw.show[k];
    }
    return {
      style: raw.style === 'ring' || raw.style === 'earth' ? raw.style : 'dome',
      light: raw.light !== false,
      aurora: raw.aurora === true,
      motion:
        raw.motion === 'planetarium' || raw.motion === 'fly' ? raw.motion : 'still',
      lastMotion: raw.lastMotion === 'fly' ? 'fly' : 'planetarium',
      show,
    };
  } catch {
    return DEFAULTS;
  }
}

type Patch = Partial<Omit<Settings, 'show'>> & { show?: Partial<Show> };

/** Inhalt des Himmel-Menüs */
function SkyMenu({
  open,
  onClose,
  settings,
  onChange,
  top,
}: {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onChange: (patch: Patch) => void;
  top: number;
}) {
  return (
    <SceneMenu open={open} onClose={onClose} top={top}>
      <MenuSection title="Bewegung" hint={motionHint[settings.motion]}>
        <SegmentedControl
          label="Bewegung"
          options={motionOptions}
          value={settings.motion}
          onChange={(motion) =>
            onChange(motion === 'still' ? { motion } : { motion, lastMotion: motion })
          }
        />
      </MenuSection>
      {settings.motion !== 'fly' && (
        <MenuSection title="Aufbau">
          <SegmentedControl
            label="Aufbau"
            options={styleOptions}
            value={settings.style}
            onChange={(style) => onChange({ style })}
          />
        </MenuSection>
      )}
      {sections.map((sec) => (
        <MenuSection key={sec.title} title={sec.title}>
          {sec.rows.map((r) => (
            <ToggleRow
              key={r.key}
              icon={r.icon}
              label={r.label}
              hint={r.hint}
              value={r.key === 'aurora' ? settings.aurora : settings.show[r.key]}
              onChange={(v) =>
                r.key === 'aurora' ? onChange({ aurora: v }) : onChange({ show: { [r.key]: v } })
              }
            />
          ))}
        </MenuSection>
      ))}
      <MenuNote>Größen und Abstände sind gebastelt, nicht maßstabsgetreu.</MenuNote>
    </SceneMenu>
  );
}

/** Karte unten: das Wichtigste und der Weg zum Steckbrief */
function PickCard({
  pick,
  onClose,
  router,
}: {
  pick: Pick;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const tabOffset = useTabBarOffset();
  const c = pick.kind === 'constellation' ? getConstellation(pick.id) : undefined;
  const d = c ? details[c.id] : undefined;
  const planet = pick.kind === 'planet' ? getPlanet(pick.id) : undefined;
  return (
    <View pointerEvents="box-none" style={[styles.bottom, { bottom: tabOffset + space.sm }]}>
      <View style={[styles.card, elevation.floating]} accessibilityLiveRegion="polite">
        <View style={styles.cardHead}>
          <View style={styles.cardText}>
            <AppText variant="heading">{pick.name}</AppText>
            <AppText variant="label" tone="muted">
              {d
                ? `${d.latin} · ${seasonLabel[d.season]}`
                : planet
                  ? planet.tagline
                  : ''}
            </AppText>
          </View>
          <IconButton icon="xmark" label="Schließen" variant="plain" onPress={onClose} />
        </View>
        {c && (
          <AppText variant="bodySmall" tone="muted">
            {c.fact}
          </AppText>
        )}
        <Button
          label={c ? 'Steckbrief öffnen' : `Mehr über ${pick.name}`}
          variant="secondary"
          icon="chevron.right"
          iconSide="right"
          onPress={() =>
            c
              ? router.push({ pathname: '/constellation/[id]', params: { id: c.id } })
              : router.push({ pathname: '/planet/[id]', params: { id: pick.id } })
          }
        />
      </View>
    </View>
  );
}

export default function SkyScreen() {
  const ctl = useMemo(createSkyController, []);
  const tabOffset = useTabBarOffset();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [picked, setPicked] = useState<Pick | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams<{ show?: string; enable?: string; t?: string }>();
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerH, setHeaderH] = useState(0);

  const apply = useCallback(
    (s: Settings) => {
      ctl.style = s.style;
      ctl.lightOn = s.light;
      ctl.aurora = s.aurora;
      ctl.anim = s.motion === 'fly';
      ctl.planetarium = s.motion === 'planetarium';
      Object.assign(ctl.show, s.show);
      setSettings(s);
    },
    [ctl]
  );

  useEffect(() => {
    let alive = true;
    readText(KEY).then((text) => alive && apply(parse(text)));
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce) ctl.reduceMotion = true;
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [apply, ctl]);

  const select = useCallback(
    (p: Pick | null) => {
      ctl.selectedId = p?.id ?? null;
      ctl.selectedKind = p?.kind ?? null;
      setPicked(p);
    },
    [ctl]
  );

  const change = useCallback(
    (patch: Patch) => {
      const next: Settings = {
        ...settings,
        ...patch,
        show: { ...settings.show, ...patch.show },
      };
      apply(next);
      writeText(KEY, JSON.stringify(next));
      if (patch.style) select(null);
    },
    [settings, apply, select]
  );

  // „Im Kasten zeigen“ aus dem Steckbrief: Sternbild auswählen und hervorheben
  useEffect(() => {
    const c = getConstellation(params.show);
    if (c) select({ kind: 'constellation', id: c.id, name: c.name });
  }, [params.show, params.t, select]);

  // Aus dem Lexikon: etwas im Kasten einschalten (Meteorstrom, Milchstraße, Nordlicht)
  useEffect(() => {
    const flag = params.enable;
    if (!flag) return;
    if (flag === 'aurora') change({ aurora: true });
    else if (flag in DEFAULTS.show) change({ show: { [flag]: true } as Partial<Show> });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.enable, params.t]);

  return (
    <View style={styles.root}>
      <SceneHeader
        title="Sternenkasten"
        hint="Ziehen zum Drehen, Sternbild antippen"
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
        actions={
          <>
            <IconButton
              icon={settings.motion !== 'still' ? 'pause.fill' : 'play.fill'}
              label={settings.motion !== 'still' ? 'Standbild' : 'Bewegung starten'}
              active={settings.motion !== 'still'}
              onPress={() =>
                change({ motion: settings.motion !== 'still' ? 'still' : settings.lastMotion })
              }
            />
            <IconButton
              icon={settings.light ? 'lightbulb.fill' : 'lightbulb'}
              label={settings.light ? 'Licht ausschalten' : 'Licht einschalten'}
              active={settings.light}
              onPress={() => change({ light: !settings.light })}
            />
            <IconButton
              icon="slider.horizontal.3"
              label={menuOpen ? 'Menü schließen' : 'Himmel einstellen'}
              active={menuOpen}
              onPress={() => setMenuOpen((o) => !o)}
            />
          </>
        }
      />
      <View style={styles.stage}>
        <StarBox
          controller={ctl}
          style={settings.style}
          onPick={select}
          labelText={picked?.name ?? null}
        />
      </View>

      {picked && <PickCard pick={picked} onClose={() => select(null)} router={router} />}

      <SkyMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        settings={settings}
        onChange={change}
        top={headerH + space.xxs}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  stage: { flex: 1 },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.sheet,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  cardText: { flex: 1, gap: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
});

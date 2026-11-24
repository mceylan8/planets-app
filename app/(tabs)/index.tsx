import { useLocalSearchParams } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';

import {
  SolarSystem,
  createCameraController,
} from '@/components/solar/SolarSystem';
import { BodySheet } from '@/components/BodySheet';
import { useTabBarOffset } from '@/components/ui/AppTabBar';
import { MenuNote, MenuSection, SceneHeader, SceneMenu } from '@/components/ui/SceneChrome';
import { IconButton, PlanetChip, SegmentedControl } from '@/components/ui/kit';
import { Body, bodies, getBody } from '@/constants/planets';
import { color, space } from '@/constants/theme';

const speeds = [
  { value: 1, label: '1×', a11y: 'Normale Geschwindigkeit, ein Erdjahr in 40 Sekunden' },
  { value: 5, label: '5×', a11y: 'Fünffache Geschwindigkeit' },
];

export default function SystemScreen() {
  const controller = useMemo(createCameraController, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerH, setHeaderH] = useState(0);
  const tabOffset = useTabBarOffset();
  const { focus, t } = useLocalSearchParams<{ focus?: string; t?: string }>();
  const selected = selectedId ? (getBody(selectedId) ?? null) : null;
  const chipsRef = useRef<ScrollView>(null);
  const chipX = useRef<Record<string, number>>({});

  // Gewählten Chip in den sichtbaren Bereich holen (schmale Screens)
  useEffect(() => {
    const x = selectedId ? chipX.current[selectedId] : undefined;
    if (x !== undefined)
      chipsRef.current?.scrollTo({
        x: Math.max(0, x - space.md),
        animated: true,
      });
  }, [selectedId]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce) {
          controller.flyDuration = 0;
          controller.autoOrbit = false;
        }
      })
      .catch(() => {});
  }, [controller]);

  const select = useCallback(
    (p: Body | null) => {
      controller.select(p);
      setSelectedId(p?.id ?? null);
    },
    [controller]
  );

  // „Im Sonnensystem zeigen“ von der Detailseite
  useEffect(() => {
    const p = getBody(focus);
    if (p) select(p);
  }, [focus, t, select]);

  return (
    <View style={styles.root}>
      <SolarSystem
        controller={controller}
        selectedId={selectedId}
        speed={playing ? speed : 0}
        onPick={select}
      />

      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <SceneHeader
          title="Sonnensystem"
          hint="Ziehen zum Drehen, Planet antippen"
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            setHeaderH(h);
            controller.insets.top = h;
          }}
          actions={
            <>
              <IconButton
                icon={playing ? 'pause.fill' : 'play.fill'}
                label={playing ? 'Bewegung anhalten' : 'Bewegung fortsetzen'}
                active={playing}
                onPress={() => setPlaying((p) => !p)}
              />
              <IconButton
                icon="slider.horizontal.3"
                label={menuOpen ? 'Menü schließen' : 'Ansicht einstellen'}
                active={menuOpen}
                onPress={() => setMenuOpen((o) => !o)}
              />
            </>
          }
        />

        <View pointerEvents="box-none" style={styles.side}>
          <IconButton
            icon="plus"
            label="Heranzoomen"
            onPress={() => controller.zoom(0.7)}
          />
          <IconButton
            icon="minus"
            label="Herauszoomen"
            onPress={() => controller.zoom(1.4)}
          />
          <IconButton
            icon="scope"
            label="Ansicht zurücksetzen"
            onPress={() => {
              select(null);
              controller.reset();
            }}
          />
        </View>

        <View
          pointerEvents="box-none"
          style={[styles.bottom, { bottom: tabOffset + space.md }]}
          onLayout={(e) => {
            controller.insets.bottom =
              e.nativeEvent.layout.height + tabOffset + space.md;
          }}
        >
          {selected && (
            <BodySheet body={selected} onClose={() => select(null)} />
          )}

          <ScrollView
            ref={chipsRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            style={styles.chipScroller}
          >
            {bodies.map((p) => (
              <PlanetChip
                key={p.id}
                planet={p}
                selected={p.id === selectedId}
                onLayout={(e) => {
                  chipX.current[p.id] = e.nativeEvent.layout.x;
                }}
                onPress={() => select(p.id === selectedId ? null : p)}
              />
            ))}
          </ScrollView>
        </View>
      </View>

      <SceneMenu open={menuOpen} onClose={() => setMenuOpen(false)} top={headerH + space.xxs}>
        <MenuSection title="Geschwindigkeit" hint="Bei 1× dauert ein Erdjahr 40 Sekunden.">
          <SegmentedControl
            label="Geschwindigkeit"
            options={speeds}
            value={speed}
            onChange={(v) => {
              setSpeed(v);
              setPlaying(true);
            }}
          />
        </MenuSection>
        <MenuNote>Größen und Abstände sind nicht maßstabsgetreu, sonst wären die Planeten unsichtbar klein.</MenuNote>
      </SceneMenu>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  side: {
    position: 'absolute',
    right: space.md,
    top: '30%',
    gap: space.xs,
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    gap: space.sm,
  },
  chipScroller: { flexGrow: 0 },
  chips: {
    paddingHorizontal: space.md,
    paddingBottom: space.xs,
    gap: space.xs,
  },
});

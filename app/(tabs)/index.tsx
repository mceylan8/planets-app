import { useLocalSearchParams } from 'expo-router';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  SolarSystem,
  createCameraController,
} from '@/components/solar/SolarSystem';
import { BodySheet } from '@/components/BodySheet';
import {
  AppText,
  IconButton,
  PlanetChip,
  SegmentedControl,
} from '@/components/ui/kit';
import { Body, bodies, getBody } from '@/constants/planets';
import { color, space } from '@/constants/theme';

const speeds = [
  { value: 0, label: 'Pause', a11y: 'Bewegung anhalten' },
  { value: 1, label: '1×', a11y: 'Normale Geschwindigkeit' },
  { value: 5, label: '5×', a11y: 'Fünffache Geschwindigkeit' },
];

export default function SystemScreen() {
  const controller = useMemo(createCameraController, []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const insets = useSafeAreaInsets();
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
        speed={speed}
        onPick={select}
      />

      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { paddingTop: insets.top + space.md }]}
      >
        <View
          pointerEvents="box-none"
          style={styles.topBar}
          onLayout={(e) => {
            controller.insets.top =
              e.nativeEvent.layout.y + e.nativeEvent.layout.height;
          }}
        >
          <View pointerEvents="none" style={styles.titleBlock}>
            <AppText variant="title" accessibilityRole="header">
              Sonnensystem
            </AppText>
            <AppText variant="bodySmall" tone="muted">
              Ziehen zum Drehen, Planet antippen
            </AppText>
          </View>
          <SegmentedControl
            label="Geschwindigkeit"
            options={speeds}
            value={speed}
            onChange={setSpeed}
          />
        </View>

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
          style={styles.bottom}
          onLayout={(e) => {
            controller.insets.bottom = e.nativeEvent.layout.height;
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingHorizontal: space.md,
  },
  titleBlock: { gap: 2, paddingTop: space.xxs },
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
    bottom: 0,
    gap: space.sm,
  },
  chipScroller: { flexGrow: 0 },
  chips: {
    paddingHorizontal: space.md,
    paddingBottom: space.md,
    gap: space.xs,
  },
});

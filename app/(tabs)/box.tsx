import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodySheet } from '@/components/BodySheet';
import {
  Diorama,
  LampMode,
  createBoxController,
} from '@/components/box/Diorama';
import { useTabBarOffset } from '@/components/ui/AppTabBar';
import { AppText, SegmentedControl } from '@/components/ui/kit';
import { Body, getBody, isPlanet } from '@/constants/planets';
import { color, space } from '@/constants/theme';

const lampModes: { value: LampMode; label: string; a11y: string }[] = [
  { value: 'all', label: 'Alles', a11y: 'Alles leuchtet' },
  { value: 'planets', label: 'Planeten', a11y: 'Nur Planeten leuchten' },
  { value: 'sun', label: 'Sonne', a11y: 'Nur Sonne leuchtet' },
];

export default function BoxScreen() {
  const controller = useMemo(createBoxController, []);
  const insets = useSafeAreaInsets();
  const tabOffset = useTabBarOffset();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lampMode, setLampMode] = useState<LampMode>('all');
  const selected = selectedId ? (getBody(selectedId) ?? null) : null;

  // Bei „Bewegung reduzieren“ kein ständiges Wiegen
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (reduce) controller.idle = false;
      })
      .catch(() => {});
  }, [controller]);

  const select = useCallback(
    (b: Body | null) => {
      controller.selectedId = b?.id ?? null;
      // Detailkarte: auf den Planeten zoomen, damit er nicht hinter der Karte verschwindet
      controller.zoomId = b && isPlanet(b) ? b.id : null;
      setSelectedId(b?.id ?? null);
    },
    [controller]
  );

  const changeLamp = useCallback(
    (mode: LampMode) => {
      controller.lampMode = mode;
      setLampMode(mode);
    },
    [controller]
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <AppText variant="title" accessibilityRole="header">
              Schaukasten
            </AppText>
            <AppText variant="bodySmall" tone="muted">
              Ziehen zum Schwingen, doppelt tippen zum Zoomen
            </AppText>
          </View>
          <SegmentedControl
            label="Licht"
            options={lampModes}
            value={lampMode}
            onChange={changeLamp}
          />
        </View>
      </View>
      <View style={styles.stage}>
        <Diorama controller={controller} onPick={select} />
      </View>
      {selected && (
        <View
          pointerEvents="box-none"
          style={[styles.sheetWrap, { bottom: tabOffset + space.sm }]}
        >
          <BodySheet body={selected} onClose={() => select(null)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  header: { paddingHorizontal: space.md, paddingBottom: space.sm },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  headerText: { flex: 1, minWidth: 160, gap: 2 },
  stage: { flex: 1 },
  sheetWrap: { position: 'absolute', left: 0, right: 0 },
});

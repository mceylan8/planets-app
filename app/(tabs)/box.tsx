import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodySheet } from '@/components/BodySheet';
import { Diorama, createBoxController } from '@/components/box/Diorama';
import { useTabBarOffset } from '@/components/ui/AppTabBar';
import { AppText, IconButton } from '@/components/ui/kit';
import { Body, getBody, isPlanet } from '@/constants/planets';
import { color, space } from '@/constants/theme';

export default function BoxScreen() {
  const controller = useMemo(createBoxController, []);
  const insets = useSafeAreaInsets();
  const tabOffset = useTabBarOffset();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lampOn, setLampOn] = useState(true);
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

  const toggleLamp = useCallback(() => {
    const next = !controller.lampOn;
    controller.lampOn = next;
    setLampOn(next);
  }, [controller]);

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
          <View style={!lampOn ? styles.lampOff : undefined}>
            <IconButton
              icon="sun.max.fill"
              label={lampOn ? 'Sonne ausschalten' : 'Sonne einschalten'}
              onPress={toggleLamp}
            />
          </View>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  lampOff: { opacity: 0.4 },
  stage: { flex: 1 },
  sheetWrap: { position: 'absolute', left: 0, right: 0 },
});

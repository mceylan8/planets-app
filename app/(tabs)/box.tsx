import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BodySheet } from '@/components/BodySheet';
import { Diorama, createBoxController } from '@/components/box/Diorama';
import { AppText } from '@/components/ui/kit';
import { Body, getBody } from '@/constants/planets';
import { color, space } from '@/constants/theme';

export default function BoxScreen() {
  const controller = useMemo(createBoxController, []);
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      setSelectedId(b?.id ?? null);
    },
    [controller]
  );

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <AppText variant="title" accessibilityRole="header">
          Schaukasten
        </AppText>
        <AppText variant="bodySmall" tone="muted">
          Ziehen zum Schwingen, doppelt tippen zum Zoomen
        </AppText>
      </View>
      <View style={styles.stage}>
        <Diorama controller={controller} onPick={select} />
      </View>
      {selected && (
        <View pointerEvents="box-none" style={styles.sheetWrap}>
          <BodySheet body={selected} onClose={() => select(null)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  header: { paddingHorizontal: space.md, paddingBottom: space.sm, gap: 2 },
  stage: { flex: 1 },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: space.md },
});

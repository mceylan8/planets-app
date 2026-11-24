/**
 * Gemeinsame Bedienung über allen 3D-Szenen:
 * - SceneHeader: Titel links, höchstens drei Icon-Knöpfe rechts, darunter eine
 *   Hinweisblase, die nach ein paar Sekunden von selbst verschwindet.
 * - SceneMenu: schwebendes Menü oben rechts, wächst aus dem Menü-Knopf.
 */
import React, { ReactNode, useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, elevation, motion, radius, space } from '@/constants/theme';
import { useTabBarOffset } from './AppTabBar';
import { AppText } from './kit';

/** Wie lange der Bedienhinweis stehen bleibt */
const HINT_MS = 4000;

export function SceneHeader({
  title,
  hint,
  actions,
  onLayout,
}: {
  title: string;
  /** Kurzer Bedienhinweis, blendet sich nach 4 s aus */
  hint?: string;
  /** Höchstens drei IconButtons */
  actions?: ReactNode;
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const insets = useSafeAreaInsets();
  const o = useSharedValue(0);
  useEffect(() => {
    if (!hint) return;
    o.value = withSequence(
      withTiming(1, { duration: 220, easing: motion.easeOut }),
      withDelay(HINT_MS, withTiming(0, { duration: 400, easing: motion.easeOut }))
    );
  }, [hint, o]);
  const bubble = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: (1 - o.value) * -4 }],
  }));
  return (
    <View
      pointerEvents="box-none"
      style={[styles.header, { paddingTop: insets.top + space.md }]}
      onLayout={onLayout}
    >
      <View pointerEvents="box-none" style={styles.row}>
        <AppText variant="title" accessibilityRole="header" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {hint ? (
        <Animated.View pointerEvents="none" style={[styles.hint, bubble]}>
          <AppText variant="label" tone="muted">
            {hint}
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

export function SceneMenu({
  open,
  onClose,
  top,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Oberkante unter der Kopfzeile */
  top: number;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  const tabOffset = useTabBarOffset();
  const [mounted, setMounted] = useState(open);
  const t = useSharedValue(0);
  useEffect(() => {
    if (open) {
      setMounted(true);
      t.value = withTiming(1, { duration: 220, easing: motion.easeOut });
    } else {
      t.value = withTiming(0, { duration: motion.sheetOut, easing: motion.easeOut }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [open, t]);
  // Web: Escape schließt
  useEffect(() => {
    if (Platform.OS !== 'web' || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const aStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ scale: 0.96 + 0.04 * t.value }, { translateY: (1 - t.value) * -6 }],
  }));
  if (!mounted) return null;
  const narrow = width < 480;
  return (
    <>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityLabel="Menü schließen"
        accessibilityRole="button"
      />
      <Animated.View
        style={[
          styles.menu,
          elevation.floating,
          narrow ? { left: space.md, right: space.md } : { right: space.md, width: 360 },
          { top, maxHeight: height - top - tabOffset - space.md },
          aStyle,
        ]}
        accessibilityViewIsModal
      >
        <ScrollView
          contentContainerStyle={styles.menuContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </>
  );
}

export function MenuSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="muted" style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
      {hint ? (
        <AppText variant="label" tone="subtle" style={styles.sectionHint}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export function MenuNote({ children }: { children: ReactNode }) {
  return (
    <AppText variant="label" tone="subtle" style={styles.note}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.md, paddingBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  title: { flex: 1, minWidth: 0 },
  actions: { flexDirection: 'row', gap: space.xs },
  hint: {
    alignSelf: 'flex-start',
    marginTop: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  menu: {
    position: 'absolute',
    borderRadius: radius.sheet,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
    overflow: 'hidden',
    transformOrigin: 'top right',
  },
  // Zeilen haben Radius control (12), Innenabstand md (16): zusammen der Sheet-Radius 28
  menuContent: { padding: space.md, gap: space.lg },
  section: { gap: space.xxs },
  sectionTitle: { paddingHorizontal: space.xs, marginBottom: space.xxs },
  sectionHint: { paddingHorizontal: space.xs, marginTop: space.xxs },
  note: { paddingHorizontal: space.xs },
});

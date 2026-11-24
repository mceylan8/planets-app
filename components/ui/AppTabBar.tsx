/**
 * Schwebende Tab-Leiste in zwei Teilen: links die drei Szenen als Pille, in der
 * eine helle Fläche zum aktiven Tab gleitet; rechts ein eigener runder Knopf
 * fürs Lexikon (Anschauen und Nachlesen getrennt).
 * Sitzt über der Safe Area, statt in sie hineinzurutschen.
 */
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, elevation, hitTarget, motion, radius, space, type } from '@/constants/theme';

/** Höhe der Pille selbst (ohne Safe-Area), für Overlays über der Leiste */
export const TAB_BAR_HEIGHT = 60;

/** Diese Route bekommt den eigenen runden Knopf */
const SIDE_ROUTE = 'planets';

/** Abstand vom unteren Bildrand bis Oberkante der schwebenden Leiste */
export function useTabBarOffset() {
  return TAB_BAR_HEIGHT + useTabBarBottom();
}

/** Abstand unter der Leiste. Web/Safari liefert oft 0 — Mindestabstand, damit nichts unter die Browser-Leiste rutscht */
function useTabBarBottom() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8);
}

type Route = BottomTabBarProps['state']['routes'][number];

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const bottom = useTabBarBottom();
  const scenes = state.routes.filter((r) => r.name !== SIDE_ROUTE);
  const side = state.routes.find((r) => r.name === SIDE_ROUTE);
  const activeKey = state.routes[state.index]?.key;

  // Helle Fläche gleitet zum aktiven Tab
  const [frames, setFrames] = useState<Record<string, { x: number; w: number }>>({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);
  const o = useSharedValue(0);
  const first = useRef(true);
  useEffect(() => {
    const f = frames[activeKey];
    if (!f) {
      o.value = withTiming(0, { duration: motion.sheetOut, easing: motion.easeOut });
      return;
    }
    const cfg = { duration: first.current ? 0 : 260, easing: motion.easeOut };
    x.value = withTiming(f.x, cfg);
    w.value = withTiming(f.w, cfg);
    o.value = withTiming(1, cfg);
    first.current = false;
  }, [activeKey, frames, x, w, o]);
  const indicator = useAnimatedStyle(() => ({
    opacity: o.value,
    width: w.value,
    transform: [{ translateX: x.value }],
  }));

  const press = (route: Route, focused: boolean) => {
    if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
  };

  const labelOf = (route: Route) => {
    const { options } = descriptors[route.key];
    return typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottom }]}>
      <View style={styles.row}>
        <View style={[styles.bar, elevation.floating]}>
          <Animated.View pointerEvents="none" style={[styles.indicator, indicator]} />
          {scenes.map((route) => {
            const focused = route.key === activeKey;
            const { options } = descriptors[route.key];
            const label = labelOf(route);
            const tint = focused ? color.onAccent : color.textMuted;
            return (
              <Pressable
                key={route.key}
                onPress={() => press(route, focused)}
                onLayout={(e) => {
                  const { x: lx, width } = e.nativeEvent.layout;
                  setFrames((prev) =>
                    prev[route.key]?.x === lx && prev[route.key]?.w === width
                      ? prev
                      : { ...prev, [route.key]: { x: lx, w: width } }
                  );
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                style={({ pressed, hovered }: any) => [
                  styles.item,
                  !focused && (pressed || hovered) && styles.itemHover,
                ]}
              >
                <View style={styles.icon}>{options.tabBarIcon?.({ focused, color: tint, size: 22 })}</View>
                <Text
                  style={[styles.label, { color: tint }, focused && styles.labelOn]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {side && (() => {
          const focused = side.key === activeKey;
          const { options } = descriptors[side.key];
          const label = labelOf(side);
          const tint = focused ? color.onAccent : color.textMuted;
          return (
            <Pressable
              onPress={() => press(side, focused)}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              style={({ pressed, hovered }: any) => [
                styles.side,
                elevation.floating,
                focused && styles.sideOn,
                !focused && (pressed || hovered) && styles.sideHover,
              ]}
            >
              <View style={styles.icon}>{options.tabBarIcon?.({ focused, color: tint, size: 22 })}</View>
              <Text style={[styles.sideLabel, { color: tint }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })()}
      </View>
    </View>
  );
}

const PAD = space.xxs;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    maxWidth: 440,
    width: '100%',
  },
  bar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    height: TAB_BAR_HEIGHT,
    padding: PAD,
    borderRadius: radius.pill,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  // Innen = außen minus Abstand: Pille in der Pille
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: 0,
    borderRadius: radius.pill,
    backgroundColor: color.accent,
  },
  item: {
    flex: 1,
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    borderRadius: radius.pill,
  },
  itemHover: { backgroundColor: color.hoverFill },
  icon: { height: 24, alignItems: 'center', justifyContent: 'center' },
  label: { ...(type.label as object), fontSize: 11, lineHeight: 14 },
  labelOn: { fontFamily: 'Inter_600SemiBold' },
  side: {
    width: TAB_BAR_HEIGHT,
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_HEIGHT / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  sideOn: { backgroundColor: color.accent, borderColor: color.accent },
  sideHover: { backgroundColor: color.surfaceRaised },
  sideLabel: { ...(type.label as object), fontSize: 10, lineHeight: 12 },
});

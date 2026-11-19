/**
 * Schwebende Tab-Leiste: sitzt über der Safe Area, statt in sie hineinzurutschen.
 * Die Standard-Leiste mit fester Höhe + paddingBottom hatte die Labels abgeschnitten.
 */
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { color, elevation, hitTarget, radius, space, type } from '@/constants/theme';

/** Höhe der Pill selbst (ohne Safe-Area), für Overlays über der Leiste */
export const TAB_BAR_HEIGHT = 60;

/** Abstand vom unteren Bildrand bis Oberkante der schwebenden Leiste */
export function useTabBarOffset() {
  return TAB_BAR_HEIGHT + useTabBarBottom();
}

/** Abstand unter der Leiste. Web/Safari liefert oft 0 — Mindestabstand, damit nichts unter die Browser-Leiste rutscht */
function useTabBarBottom() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8);
}

export function AppTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const bottom = useTabBarBottom();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottom }]}>
      <View style={[styles.bar, elevation.floating]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title ?? route.name;
          const colorTint = focused
            ? (options.tabBarActiveTintColor ?? color.accent)
            : (options.tabBarInactiveTintColor ?? color.textMuted);
          const onPress = () => {
            if (process.env.EXPO_OS === 'ios') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={styles.icon}>
                {options.tabBarIcon?.({ focused, color: colorTint, size: 22 })}
              </View>
              <Text style={[styles.label, { color: colorTint }]} numberOfLines={1}>
                {label}
              </Text>
              <View
                style={[styles.dot, focused && styles.dotOn]}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    maxWidth: 420,
    width: '100%',
    paddingVertical: space.xs,
    paddingHorizontal: space.xxs,
    borderRadius: radius.sheet,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  item: {
    flex: 1,
    minHeight: hitTarget,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: space.xxs,
    borderRadius: radius.control,
  },
  pressed: { backgroundColor: color.hoverFill },
  icon: { height: 24, alignItems: 'center', justifyContent: 'center' },
  label: {
    ...(type.label as object),
    fontSize: 11,
    lineHeight: 14,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
    backgroundColor: 'transparent',
  },
  dotOn: { backgroundColor: color.accent },
});

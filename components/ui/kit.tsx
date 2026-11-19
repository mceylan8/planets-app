/**
 * Bausteine des Design-Systems. Doku mit Varianten und Zuständen: DESIGN.md.
 * Alle Werte kommen aus constants/theme.ts.
 */
import React, { ReactNode } from 'react';
import {
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { color, elevation, hitTarget, motion, radius, space, type } from '@/constants/theme';
import { Body } from '@/constants/planets';
import { IconSymbol, IconSymbolName } from './IconSymbol';

/* ---------- Text ---------- */

type Tone = 'default' | 'muted' | 'subtle' | 'accent' | 'onAccent';
const toneColor: Record<Tone, string> = {
  default: color.text,
  muted: color.textMuted,
  subtle: color.textSubtle,
  accent: color.accent,
  onAccent: color.onAccent,
};

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...rest
}: TextProps & { variant?: keyof typeof type; tone?: Tone }) {
  return <Text style={[type[variant] as any, { color: toneColor[tone] }, style]} {...rest} />;
}

/* ---------- Pressable mit Druck-Feedback ---------- */

// Fokusring nur bei Tastaturbedienung (wie :focus-visible), nicht nach Mausklick
let keyboardModality = false;
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.addEventListener('keydown', () => (keyboardModality = true), true);
  document.addEventListener('pointerdown', () => (keyboardModality = false), true);
}

const focusRing = Platform.select<ViewStyle>({
  web: { outlineColor: color.accent, outlineStyle: 'solid', outlineWidth: 2, outlineOffset: 2 } as ViewStyle,
  default: { borderColor: color.accent },
});

type ScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle> | ((s: { pressed: boolean; hovered: boolean; focused: boolean }) => StyleProp<ViewStyle>);
  children: ReactNode | ((s: { pressed: boolean; hovered: boolean }) => ReactNode);
  /** Kein Skalieren, z. B. für Listenzeilen */
  static?: boolean;
  /** Layout des äußeren Pressable (flex, alignSelf, margin) */
  containerStyle?: StyleProp<ViewStyle>;
};

/** Skaliert beim Drücken auf 0.96 (140 ms, ease-out). Fokusring nur bei Tastatur. */
export function PressableScale({
  style,
  children,
  static: isStatic,
  containerStyle,
  onPressIn,
  onPressOut,
  ...rest
}: ScaleProps) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      {...rest}
      style={containerStyle}
      onPressIn={(e) => {
        if (!isStatic) scale.value = withTiming(motion.pressScale, { duration: motion.press, easing: motion.easeOut });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!isStatic) scale.value = withTiming(1, { duration: motion.press, easing: motion.easeOut });
        onPressOut?.(e);
      }}>
      {(state: any) => {
        const s = { pressed: state.pressed, hovered: !!state.hovered, focused: !!state.focused && keyboardModality };
        const resolved = typeof style === 'function' ? style(s) : style;
        return (
          <Animated.View style={[resolved, s.focused && Platform.OS === 'web' && focusRing, aStyle]}>
            {typeof children === 'function' ? children(s) : children}
          </Animated.View>
        );
      }}
    </Pressable>
  );
}

/* ---------- Button ---------- */

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  iconSide = 'left',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: IconSymbolName;
  iconSide?: 'left' | 'right';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const primary = variant === 'primary';
  const fg = primary ? color.onAccent : color.text;
  const iconEl = icon ? <IconSymbol name={icon} size={18} color={fg} /> : null;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      containerStyle={style}
      style={({ pressed, hovered }) => [
        styles.button,
        primary
          ? { backgroundColor: pressed || hovered ? color.accentPressed : color.accent }
          : { backgroundColor: hovered || pressed ? color.selectedFill : color.surfaceRaised },
        disabled && styles.disabled,
      ]}>
      {iconSide === 'left' && iconEl}
      <Text style={[type.label as any, styles.buttonLabel, { color: fg }]}>{label}</Text>
      {iconSide === 'right' && iconEl}
    </PressableScale>
  );
}

/* ---------- IconButton ---------- */

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'floating',
}: {
  icon: IconSymbolName;
  /** Pflicht: wird vorgelesen */
  label: string;
  onPress: () => void;
  variant?: 'floating' | 'plain';
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={({ hovered, pressed }) => [
        styles.iconButton,
        variant === 'floating' && [styles.floating, elevation.floating],
        (hovered || pressed) && { backgroundColor: variant === 'floating' ? color.surfaceRaised : color.hoverFill },
      ]}>
      <IconSymbol name={icon} size={22} color={color.text} />
    </PressableScale>
  );
}

/* ---------- SegmentedControl ---------- */

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; a11y?: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <View style={[styles.segmentTrack, elevation.floating]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={String(o.value)}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.a11y ?? o.label}
            style={({ hovered }) => [
              styles.segment,
              selected ? { backgroundColor: color.selectedFill } : hovered && { backgroundColor: color.hoverFill },
            ]}>
            <Text style={[type.label as any, { color: selected ? color.text : color.textMuted }]}>{o.label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/* ---------- PlanetSwatch ---------- */

/** Flache Vorschau eines Körpers: Grundfarbe, Bänder, Schattenseite, ggf. Ring. Die Sonne leuchtet statt Schatten. */
export function PlanetSwatch({ planet, size }: { planet: Body; size: number }) {
  const { base, band, ring } = planet.swatch;
  if (planet.type === 'star') {
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: base,
            opacity: 0.25,
          }}
        />
        <View style={{ width: size * 0.74, height: size * 0.74, borderRadius: size, backgroundColor: base }} />
      </View>
    );
  }
  return (
    <View style={{ width: size * (ring ? 1.5 : 1), height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: base, overflow: 'hidden' }}>
        {band &&
          [0.3, 0.55, 0.72].map((y, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: size * y,
                height: size * (i === 1 ? 0.1 : 0.06),
                backgroundColor: band,
                opacity: 0.55,
              }}
            />
          ))}
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            left: size * 0.36,
            top: -size * 0.06,
            backgroundColor: 'rgba(5, 6, 10, 0.55)',
          }}
        />
      </View>
      {ring && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size * 1.5,
            height: size * 0.36,
            borderRadius: size,
            borderWidth: Math.max(2, size * 0.05),
            borderColor: ring,
            opacity: 0.85,
            transform: [{ rotate: '-14deg' }],
          }}
        />
      )}
    </View>
  );
}

/* ---------- Chip ---------- */

export function PlanetChip({
  planet,
  selected,
  onPress,
  onLayout,
}: {
  planet: Body;
  selected: boolean;
  onPress: () => void;
  onLayout?: PressableProps['onLayout'];
}) {
  return (
    <PressableScale
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${planet.name} auswählen`}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ hovered }) => [
        styles.chip,
        selected
          ? { backgroundColor: color.accent }
          : { backgroundColor: hovered ? color.surfaceRaised : color.surface },
      ]}>
      <View style={[styles.chipDot, { backgroundColor: planet.swatch.base }]} />
      <Text style={[type.label as any, { color: selected ? color.onAccent : color.text }]}>{planet.name}</Text>
    </PressableScale>
  );
}

/* ---------- Fact ---------- */

export function Fact({ label, value, variant = 'inline' }: { label: string; value: string; variant?: 'inline' | 'tile' }) {
  return (
    <View style={variant === 'tile' ? styles.factTile : styles.factInline}>
      <AppText variant="label" tone="subtle">
        {label}
      </AppText>
      <AppText variant={variant === 'tile' ? 'data' : 'dataSmall'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: hitTarget,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.4 },
  iconButton: {
    width: hitTarget,
    height: hitTarget,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floating: { backgroundColor: color.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: color.border },
  segmentTrack: {
    flexDirection: 'row',
    padding: space.xxs,
    borderRadius: radius.control,
    backgroundColor: color.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  segment: {
    minWidth: 48,
    height: 36,
    paddingHorizontal: space.sm,
    // Innenradius = Track-Radius minus Innenabstand
    borderRadius: radius.control - space.xxs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    height: 40,
    paddingLeft: space.sm,
    paddingRight: space.md,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border,
  },
  chipDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(5, 6, 10, 0.35)' },
  factInline: { gap: 2, minWidth: 0, flexShrink: 1 },
  factTile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: space.xxs,
    padding: space.md,
    borderRadius: radius.tile,
    backgroundColor: color.surface,
  },
});

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { CountUpText } from '@/components/ui/CountUp';
import { AppText, PlanetSwatch } from '@/components/ui/kit';
import { Body, FactItem, getPlanet, isPlanet } from '@/constants/planets';
import { sizeComparison, travelFacts, weightFact } from '@/lib/compare';
import { color, radius, space } from '@/constants/theme';

/* ---------- Sichtbarkeit beim Scrollen ---------- */

/**
 * Meldet Scroll-Ereignisse an die Kacheln, ohne die Seite neu zu rendern.
 * Die Seite legt einen Bus an und ruft bei onScroll `emit()` auf.
 */
export function createScrollBus() {
  const listeners = new Set<() => void>();
  return {
    emit: () => listeners.forEach((l) => l()),
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}
export type ScrollBus = ReturnType<typeof createScrollBus>;
export const ScrollTick = createContext<ScrollBus | null>(null);

/** true, sobald die View im sichtbaren Bereich ankommt. Bleibt danach true. */
function useRevealed() {
  const ref = useRef<View>(null);
  const bus = useContext(ScrollTick);
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);

  const check = useCallback(() => {
    if (shownRef.current) return;
    ref.current?.measureInWindow((_x, y, _w, h) => {
      if (h > 0 && y < Dimensions.get('window').height - 48) {
        shownRef.current = true;
        setShown(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!bus) return;
    const off = bus.subscribe(check);
    return () => {
      off();
    };
  }, [bus, check]);

  return [ref, shown, check] as const;
}

/* ---------- Kachel mit hochzählendem Wert ---------- */

export function CountFact({
  item,
  delay,
  wide,
}: {
  item: FactItem;
  delay: number;
  wide?: boolean;
}) {
  const [ref, shown, onLayout] = useRevealed();
  return (
    <View
      ref={ref}
      onLayout={onLayout}
      style={[styles.tile, wide && styles.wide]}
    >
      <AppText variant="label" tone="subtle">
        {item.label}
      </AppText>
      <CountUpText text={item.value} delay={delay} active={shown} />
    </View>
  );
}

export function FactGrid({
  items,
  baseDelay = 0,
}: {
  items: FactItem[];
  baseDelay?: number;
}) {
  return (
    <View style={styles.grid}>
      {items.map((f, i) => (
        <CountFact key={f.label} item={f} delay={baseDelay + i * 70} />
      ))}
    </View>
  );
}

/* ---------- Vergleiche ---------- */

function SizeCompare({ body }: { body: Body }) {
  const earth = getPlanet('erde')!;
  const isEarth = body.id === 'erde';
  const { title, sub, ratio, refName } = sizeComparison(body);
  const bigger = ratio >= 1;

  // Beide Kreise im echten Größenverhältnis, der größere 112 px
  const max = 112;
  const sizeBody = bigger ? max : Math.max(3, max * ratio);
  const sizeRef = bigger ? Math.max(3, max / ratio) : max;

  const [ref, shown, onLayout] = useRevealed();
  return (
    <View
      ref={ref}
      onLayout={onLayout}
      style={[styles.tile, styles.wide, styles.sizeTile]}
    >
      <View
        style={styles.circles}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.circleCol}>
          <PlanetSwatch planet={body} size={sizeBody} />
          <AppText variant="label" tone="subtle">
            {body.name}
          </AppText>
        </View>
        <View style={styles.circleCol}>
          {isEarth ? (
            <View
              style={{
                width: sizeRef,
                height: sizeRef,
                borderRadius: sizeRef,
                backgroundColor: '#B9B6B0',
              }}
            />
          ) : (
            <PlanetSwatch planet={earth} size={sizeRef} />
          )}
          <AppText variant="label" tone="subtle">
            {refName}
          </AppText>
        </View>
      </View>
      <View style={styles.sizeText}>
        <CountUpText text={title} variant="heading" active={shown} />
        <AppText tone="muted">{sub}</AppText>
      </View>
    </View>
  );
}

export function Comparisons({ body }: { body: Body }) {
  const travel = travelFacts(body);
  const weight = weightFact(body);

  return (
    <View style={styles.section}>
      <AppText variant="title" accessibilityRole="header">
        Zum Vergleich
      </AppText>
      <View style={styles.grid}>
        <SizeCompare body={body} />
        {travel.map((f, i) => (
          <CountFact key={f.label} item={f} delay={i * 80} />
        ))}
        <CountFact item={weight} delay={160} />
      </View>
      <AppText variant="label" tone="subtle">
        Reisezeiten nonstop über die mittlere Entfernung. Schwerkraft an der
        Oberfläche
        {isPlanet(body) && body.type !== 'rocky'
          ? ' bzw. an der Wolkenobergrenze'
          : ''}
        .
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    gap: space.xxs,
    padding: space.md,
    borderRadius: radius.tile,
    backgroundColor: color.surface,
  },
  wide: { flexBasis: '100%' },
  section: { marginTop: space.xxxl, gap: space.md },
  sizeTile: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.lg,
  },
  circles: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.lg,
    minHeight: 112 + 24,
  },
  circleCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: space.xs,
  },
  sizeText: { flex: 1, minWidth: 200, gap: space.xxs },
});

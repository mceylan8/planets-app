import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarOffset } from '@/components/ui/AppTabBar';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { ConstellationSketch } from '@/components/sky/ConstellationSketch';
import { AppText, PlanetSwatch, PressableScale, SegmentedControl } from '@/components/ui/kit';
import { phenomena } from '@/constants/phenomena';
import {
  Constellation,
  brightStars,
  constellations,
  details,
  getConstellation,
  seasonLabel,
  seasonOrder,
} from '@/constants/constellations';
import { thumbs } from '@/constants/thumbs';
import {
  Body,
  PlanetType,
  bodies,
  dwarfPlanets,
  formatDistance,
  planetTypeGroupLabel,
} from '@/constants/planets';
import { color, radius, space } from '@/constants/theme';

const groups: (PlanetType | 'star')[] = ['star', 'rocky', 'gas', 'ice'];
const groupLabel = { ...planetTypeGroupLabel, star: 'Stern' };

function PlanetRow({
  planet,
  showDistance,
}: {
  planet: Body;
  showDistance: boolean;
}) {
  const router = useRouter();
  return (
    <PressableScale
      static
      onPress={() =>
        router.push({ pathname: '/planet/[id]', params: { id: planet.id } })
      }
      accessibilityRole="link"
      accessibilityLabel={`${planet.name}: ${planet.tagline}`}
      style={({ hovered, pressed }) => [
        styles.row,
        {
          backgroundColor:
            hovered || pressed ? color.surfaceRaised : color.surface,
        },
      ]}
    >
      {thumbs[planet.id] ? (
        <Image
          source={thumbs[planet.id]}
          style={styles.thumb}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={styles.thumb}>
          <PlanetSwatch planet={planet} size={40} />
        </View>
      )}
      <View style={styles.rowText}>
        <AppText variant="heading">{planet.name}</AppText>
        <AppText variant="bodySmall" tone="muted" numberOfLines={2}>
          {planet.tagline}
        </AppText>
      </View>
      {showDistance && planet.type !== 'star' && (
        <AppText variant="dataSmall" tone="subtle" style={styles.distance}>
          {formatDistance(planet.facts.distanceMioKm)}
        </AppText>
      )}
      <IconSymbol name="chevron.right" size={20} color={color.textSubtle} />
    </PressableScale>
  );
}

function ConstellationRow({ c }: { c: Constellation }) {
  const router = useRouter();
  const d = details[c.id];
  return (
    <PressableScale
      static
      onPress={() => router.push({ pathname: '/constellation/[id]', params: { id: c.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${c.name}: ${d.tagline}`}
      style={({ hovered, pressed }) => [
        styles.row,
        { backgroundColor: hovered || pressed ? color.surfaceRaised : color.surface },
      ]}
    >
      <View style={styles.sketch}>
        <ConstellationSketch c={c} size={56} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="heading">{c.name}</AppText>
        <AppText variant="bodySmall" tone="muted" numberOfLines={2}>
          {d.tagline}
        </AppText>
      </View>
      <IconSymbol name="chevron.right" size={20} color={color.textSubtle} />
    </PressableScale>
  );
}

function StarRow({ index }: { index: number }) {
  const router = useRouter();
  const st = brightStars[index];
  const c = getConstellation(st.constellation);
  return (
    <PressableScale
      static
      onPress={() => router.push({ pathname: '/star/[id]', params: { id: st.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${st.name}, ${st.distance}, im Sternbild ${c?.name ?? ''}`}
      style={({ hovered, pressed }) => [
        styles.row,
        { backgroundColor: hovered || pressed ? color.surfaceRaised : color.surface },
      ]}
    >
      <View style={styles.starDotWrap}>
        <View style={[styles.starHalo, { backgroundColor: st.color }]} />
        <View style={[styles.starDot, { backgroundColor: st.color }]} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="heading">{st.name}</AppText>
        <AppText variant="bodySmall" tone="muted" numberOfLines={2}>
          {c?.name} · {st.note}
        </AppText>
      </View>
      <AppText variant="dataSmall" tone="subtle">
        {st.distance}
      </AppText>
    </PressableScale>
  );
}

function PhenomenonRow({ index }: { index: number }) {
  const router = useRouter();
  const p = phenomena[index];
  return (
    <PressableScale
      static
      onPress={() => router.push({ pathname: '/phenomenon/[id]', params: { id: p.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${p.name}: ${p.tagline}`}
      style={({ hovered, pressed }) => [
        styles.row,
        { backgroundColor: hovered || pressed ? color.surfaceRaised : color.surface },
      ]}
    >
      <View style={styles.sketch}>
        <IconSymbol name={p.icon} size={26} color={color.text} />
      </View>
      <View style={styles.rowText}>
        <AppText variant="heading">{p.name}</AppText>
        <AppText variant="bodySmall" tone="muted" numberOfLines={2}>
          {p.tagline}
        </AppText>
      </View>
      <IconSymbol name="chevron.right" size={20} color={color.textSubtle} />
    </PressableScale>
  );
}

type View_ = 'planets' | 'constellations' | 'stars' | 'phenomena';
const viewOptions: { value: View_; label: string; a11y: string }[] = [
  { value: 'planets', label: 'Planeten', a11y: 'Planeten und Sonne' },
  { value: 'constellations', label: 'Sternbilder', a11y: 'Sternbilder nach Jahreszeit' },
  { value: 'stars', label: 'Sterne', a11y: 'Die hellsten Sterne' },
  { value: 'phenomena', label: 'Phänomene', a11y: 'Milchstraße, Polarlicht, Sternschnuppen und mehr' },
];
const intro: Record<View_, string> = {
  planets: 'Die Sonne, ihre acht Planeten von innen nach außen und zwei Zwergplaneten.',
  phenomena: 'Was am Himmel passiert: von der Milchstraße über Polarlichter bis zu Sternschnuppen.',
  constellations: '32 Sternbilder, sortiert danach, wann man sie abends von Mitteleuropa aus am besten sieht.',
  stars: 'Die hellsten Sterne am Nachthimmel. Die Farbe zeigt die Temperatur: bläulich ist heiß, rötlich kühler.',
};

export default function PlanetsScreen() {
  const [view, setView] = useState<View_>('planets');
  const insets = useSafeAreaInsets();
  const tabOffset = useTabBarOffset();
  const { width } = useWindowDimensions();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + space.xl,
          paddingBottom: tabOffset + space.xl,
        },
      ]}
    >
      <View style={styles.inner}>
        <AppText variant="display" accessibilityRole="header">
          Lexikon
        </AppText>
        <View style={styles.switcher}>
          <SegmentedControl label="Ansicht" options={viewOptions} value={view} onChange={setView} />
        </View>
        <AppText tone="muted" style={styles.intro}>
          {intro[view]}
        </AppText>

        {view === 'constellations' &&
          seasonOrder.map((season) => {
            const list = constellations.filter((c) => details[c.id].season === season);
            if (!list.length) return null;
            return (
              <View key={season} style={styles.group}>
                <AppText variant="heading" tone="muted" accessibilityRole="header" style={styles.groupTitle}>
                  {seasonLabel[season]}
                </AppText>
                <View style={styles.rows}>
                  {list.map((c) => (
                    <ConstellationRow key={c.id} c={c} />
                  ))}
                </View>
              </View>
            );
          })}

        {view === 'stars' && (
          <View style={[styles.rows, styles.group]}>
            {brightStars.map((st, i) => (
              <StarRow key={st.name} index={i} />
            ))}
          </View>
        )}

        {view === 'phenomena' && (
          <View style={[styles.rows, styles.group]}>
            {phenomena.map((p, i) => (
              <PhenomenonRow key={p.id} index={i} />
            ))}
          </View>
        )}

        {view === 'planets' && groups.map((g) => (
          <View key={g} style={styles.group}>
            <AppText
              variant="heading"
              tone="muted"
              accessibilityRole="header"
              style={styles.groupTitle}
            >
              {groupLabel[g]}
            </AppText>
            <View style={styles.rows}>
              {bodies
                .filter((p) => p.type === g)
                .map((p) => (
                  <PlanetRow
                    key={p.id}
                    planet={p}
                    showDistance={width >= 520}
                  />
                ))}
            </View>
          </View>
        ))}

        {view === 'planets' && (
          <View style={styles.group}>
            <AppText variant="heading" tone="muted" accessibilityRole="header" style={styles.groupTitle}>
              Zwergplaneten
            </AppText>
            <View style={styles.rows}>
              {dwarfPlanets.map((p) => (
                <PlanetRow key={p.id} planet={p} showDistance={width >= 520} />
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  content: {
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  inner: { width: '100%', maxWidth: 720 },
  intro: { marginTop: space.xs, maxWidth: 520 },
  group: { marginTop: space.xxl },
  groupTitle: { marginBottom: space.sm },
  rows: { gap: space.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    paddingRight: space.md,
    borderRadius: radius.tile,
  },
  thumb: { width: 64, height: 64 },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  distance: { marginLeft: space.xs },
  switcher: { marginTop: space.md, alignSelf: 'flex-start' },
  sketch: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    backgroundColor: color.space,
  },
  starDotWrap: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  starHalo: { position: 'absolute', width: 34, height: 34, borderRadius: 17, opacity: 0.18 },
  starDot: { width: 14, height: 14, borderRadius: 7 },
});

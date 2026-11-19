import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { AppText, PressableScale } from '@/components/ui/kit';
import { thumbs } from '@/constants/thumbs';
import {
  Body,
  PlanetType,
  bodies,
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
      <Image
        source={thumbs[planet.id]}
        style={styles.thumb}
        accessibilityIgnoresInvertColors
      />
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

export default function PlanetsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + space.xl },
      ]}
    >
      <View style={styles.inner}>
        <AppText variant="display" accessibilityRole="header">
          Planeten
        </AppText>
        <AppText tone="muted" style={styles.intro}>
          Die Sonne und ihre acht Planeten, von innen nach außen: vier aus
          Gestein, zwei Gasriesen und zwei Eisriesen.
        </AppText>

        {groups.map((g) => (
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.space },
  content: {
    paddingHorizontal: space.md,
    paddingBottom: space.xxxl,
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
});
